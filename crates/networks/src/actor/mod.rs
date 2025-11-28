mod ext;

use std::{fs::File, ops::ControlFlow, path::PathBuf};

use ethui_types::{Affinity, Network, NetworkId, NewNetworkParams, UINotify, prelude::*};
pub use ext::NetworksActorExt;
use kameo::prelude::*;

use crate::{SerializedNetworks, migrations::load_and_migrate};

#[derive(Debug)]
pub struct NetworksActor {
    inner: SerializedNetworks,
    file: PathBuf,
}

pub fn networks() -> ActorRef<NetworksActor> {
    try_networks().expect("networks actor not initialized")
}

pub fn try_networks() -> color_eyre::Result<ActorRef<NetworksActor>> {
    ActorRef::<NetworksActor>::lookup("networks")?
        .ok_or_else(|| color_eyre::eyre::eyre!("networks actor not found"))
}

impl Actor for NetworksActor {
    type Args = PathBuf;
    type Error = color_eyre::Report;

    async fn on_start(args: Self::Args, _actor_ref: ActorRef<Self>) -> color_eyre::Result<Self> {
        let pathbuf = args;
        let path = std::path::Path::new(&pathbuf);

        let inner: SerializedNetworks = if path.exists() {
            load_and_migrate(&pathbuf).expect("failed to load networks")
        } else {
            let networks = Network::all_default();
            let current = networks[0].name.clone();

            SerializedNetworks {
                networks: networks.into_iter().map(|n| (n.name.clone(), n)).collect(),
                current,
                version: serde_constant::ConstI64,
            }
        };

        let actor = Self {
            inner,
            file: pathbuf,
        };

        actor.broadcast_init().await;

        Ok(actor)
    }

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> color_eyre::Result<ControlFlow<ActorStopReason>> {
        error!("networks actor panic: {}", err);
        Ok(ControlFlow::Continue(()))
    }
}

#[messages]
impl NetworksActor {
    fn get_current_inner(&self) -> &Network {
        if !self.inner.networks.contains_key(&self.inner.current) {
            return self
                .inner
                .networks
                .values()
                .next()
                .expect("No networks available");
        }

        &self.inner.networks[&self.inner.current]
    }

    async fn on_network_changed(&self) -> color_eyre::Result<()> {
        self.notify_peers();
        ethui_broadcast::ui_notify(UINotify::CurrentNetworkChanged).await;

        let network = self.get_current_inner().clone();
        ethui_broadcast::current_network_changed(network).await;

        Ok(())
    }

    fn notify_peers(&self) {
        let current = self.get_current_inner().clone();
        tokio::spawn(async move {
            ethui_broadcast::chain_changed(current.dedup_chain_id(), None, Affinity::Global).await;
        });
    }

    async fn broadcast_init(&self) {
        for network in self.inner.networks.values() {
            ethui_broadcast::network_added(network.clone()).await;
        }

        let network = self.get_current_inner().clone();
        ethui_broadcast::current_network_changed(network).await;
    }

    fn save(&self) -> color_eyre::Result<()> {
        let file = File::create(&self.file)?;
        serde_json::to_writer_pretty(file, &self.inner)?;
        Ok(())
    }

    fn get_chain_id_count(&self, chain_id: u32) -> usize {
        self.inner
            .networks
            .values()
            .filter(|network| network.chain_id() == chain_id)
            .count()
    }

    #[message]
    fn get_current(&self) -> Network {
        self.get_current_inner().clone()
    }

    #[message]
    fn get_list(&self) -> Vec<Network> {
        self.inner.networks.values().cloned().collect()
    }

    #[message]
    fn get(&self, chain_id: u32) -> Option<Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.chain_id() == chain_id)
            .cloned()
    }

    #[message]
    fn get_by_name(&self, name: String) -> Option<Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.name == name)
            .cloned()
    }

    #[message]
    fn get_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Option<Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.id == dedup_chain_id)
            .cloned()
    }

    #[message]
    fn validate_chain_id(&self, chain_id: u32) -> bool {
        self.inner
            .networks
            .iter()
            .any(|(_, n)| n.chain_id() == chain_id)
    }

    #[message]
    fn get_lowest_dedup_id(&self, chain_id: u32) -> u32 {
        self.inner
            .networks
            .values()
            .filter(|network| network.chain_id() == chain_id)
            .map(|network| network.id.dedup_id())
            .min()
            .unwrap_or(0)
    }

    #[message]
    async fn set_current_by_name(&mut self, new_current_network: String) -> color_eyre::Result<()> {
        let previous = self.get_current_inner().name.clone();
        self.inner.current = new_current_network;
        let new = self.get_current_inner().name.clone();

        if previous != new {
            self.on_network_changed().await?;
        }

        self.save()?;

        Ok(())
    }

    #[message]
    async fn set_current_by_dedup_chain_id(
        &mut self,
        dedup_chain_id: NetworkId,
    ) -> color_eyre::Result<()> {
        let new_network = self
            .inner
            .networks
            .values()
            .find(|n| n.dedup_chain_id() == dedup_chain_id)
            .with_context(|| format!("Network with dedup_chain_id {dedup_chain_id:?} not found"))?;

        let name = new_network.name.clone();
        self.inner.current = name;
        self.on_network_changed().await?;
        self.save()?;

        Ok(())
    }

    #[message]
    async fn add(&mut self, network: NewNetworkParams) -> color_eyre::Result<()> {
        if self.inner.networks.contains_key(&network.name) {
            return Err(eyre!("Already exists"));
        }

        let deduplication_id = self.get_chain_id_count(network.chain_id) as u32;
        let network = network.into_network(deduplication_id);

        if !network.is_dev().await
            & self
                .inner
                .networks
                .values()
                .any(|n| n.id == network.dedup_chain_id())
        {
            return Err(eyre!("Already exists"));
        }

        self.inner
            .networks
            .insert(network.name.clone(), network.clone());

        self.save()?;
        ethui_broadcast::network_added(network.clone()).await;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;

        Ok(())
    }

    #[message]
    async fn update(&mut self, old_name: String, network: Network) -> color_eyre::Result<()> {
        if network.name != old_name && self.inner.networks.contains_key(&network.name) {
            return Err(eyre!("Already exists"));
        }

        self.inner.networks.remove(&old_name);
        self.inner
            .networks
            .insert(network.clone().name.clone(), network.clone());

        if self.inner.current == old_name {
            self.inner.current = network.name.clone();
            self.on_network_changed().await?;
        }

        self.save()?;
        ethui_broadcast::network_updated(network.clone()).await;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;

        Ok(())
    }

    #[message]
    async fn remove(&mut self, name: String) -> color_eyre::Result<()> {
        let network = self.inner.networks.remove(&name);

        match network {
            Some(network) => {
                if self.inner.current == name {
                    let first = self
                        .inner
                        .networks
                        .values()
                        .next()
                        .with_context(|| "No networks remaining")?;
                    self.inner.current = first.name.clone();
                    self.on_network_changed().await?;
                }
                self.save()?;
                ethui_broadcast::network_removed(network).await;
                ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
            }
            None => {
                return Err(eyre!("Does not exist"));
            }
        }
        Ok(())
    }

    #[message]
    fn update_statuses(&mut self, updates: Vec<(String, Network)>) -> color_eyre::Result<()> {
        for (key, updated_network) in updates {
            self.inner.networks.insert(key, updated_network);
        }

        self.save()?;
        Ok(())
    }
}
