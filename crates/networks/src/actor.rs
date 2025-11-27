use std::{
    fs::File,
    path::PathBuf,
    time::Duration,
};

use ethui_broadcast::InternalMsg;
use ethui_types::{Affinity, NetworkId, NetworkStatus, NewNetworkParams, UINotify, prelude::*};
use futures::{StreamExt, stream};
use kameo::prelude::*;
use tokio::time::{interval, timeout};

use crate::{SerializedNetworks, migrations::load_and_migrate};

#[derive(Debug)]
pub struct NetworksActor {
    inner: SerializedNetworks,
    file: PathBuf,
}

pub async fn ask<M>(msg: M) -> Result<<<NetworksActor as Message<M>>::Reply as Reply>::Ok>
where
    NetworksActor: Message<M>,
    M: Send + 'static + Sync,
    <<NetworksActor as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor = ActorRef::<NetworksActor>::lookup("networks")?
        .wrap_err_with(|| "networks actor not found")?;

    match actor.ask(msg).await {
        Ok(ret) => Ok(ret),
        Err(e) => Err(eyre!("{}", e)),
    }
}

pub async fn tell<M>(msg: M) -> Result<()>
where
    NetworksActor: Message<M>,
    M: Send + 'static + Sync,
    <<NetworksActor as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor = ActorRef::<NetworksActor>::lookup("networks")?
        .wrap_err_with(|| "networks actor not found")?;

    actor.tell(msg).await.map_err(Into::into)
}

impl NetworksActor {
    fn new(file: PathBuf) -> Result<Self> {
        let inner = if file.exists() {
            load_and_migrate(&file)?
        } else {
            let networks = Network::all_default();
            let current = networks[0].name.clone();

            SerializedNetworks {
                networks: networks.into_iter().map(|n| (n.name.clone(), n)).collect(),
                current,
                version: serde_constant::ConstI64,
            }
        };

        let actor = Self { inner, file };
        actor.save()?;
        Ok(actor)
    }

    fn save(&self) -> Result<()> {
        let file = File::create(&self.file)?;
        serde_json::to_writer_pretty(file, &self.inner)?;
        Ok(())
    }

    fn get_current(&self) -> &Network {
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

    fn get_network(&self, chain_id: u32) -> Option<&Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.chain_id() == chain_id)
    }

    fn get_network_by_name(&self, name: &str) -> Option<&Network> {
        self.inner.networks.values().find(|n| n.name == name)
    }

    fn get_network_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Option<&Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.id == dedup_chain_id)
    }

    fn validate_chain_id(&self, chain_id: u32) -> bool {
        self.inner
            .networks
            .iter()
            .any(|(_, n)| n.chain_id() == chain_id)
    }

    fn get_chain_id_count(&self, chain_id: u32) -> usize {
        self.inner
            .networks
            .values()
            .filter(|network| network.chain_id() == chain_id)
            .count()
    }

    fn get_lowest_dedup_id(&self, chain_id: u32) -> u32 {
        self.inner
            .networks
            .values()
            .filter(|network| network.chain_id() == chain_id)
            .map(|network| network.id.dedup_id())
            .min()
            .unwrap_or(0)
    }

    async fn on_network_changed(&self) -> Result<()> {
        self.notify_peers();
        ethui_broadcast::ui_notify(UINotify::CurrentNetworkChanged).await;

        let network = self.get_current().clone();
        ethui_broadcast::current_network_changed(network).await;

        Ok(())
    }

    fn notify_peers(&self) {
        let current = self.get_current().clone();
        tokio::spawn(async move {
            ethui_broadcast::chain_changed(current.dedup_chain_id(), None, Affinity::Global).await;
        });
    }

    async fn broadcast_init(&self) {
        for network in self.inner.networks.values() {
            ethui_broadcast::network_added(network.clone()).await;
        }

        let network = self.get_current().clone();
        ethui_broadcast::current_network_changed(network).await;
    }

    async fn set_current_by_name(&mut self, new_current_network: String) -> Result<()> {
        let previous = self.get_current().name.clone();
        self.inner.current = new_current_network;
        let new = self.get_current().name.clone();

        if previous != new {
            self.on_network_changed().await?;
        }

        self.save()?;
        Ok(())
    }

    async fn set_current_by_id(&mut self, new_chain_id: u32) -> Result<()> {
        let new_network = self
            .inner
            .networks
            .values()
            .find(|n| n.chain_id() == new_chain_id)
            .wrap_err_with(|| format!("Network with chain_id {new_chain_id} not found"))?;

        self.set_current_by_name(new_network.name.clone()).await?;
        self.save()?;
        Ok(())
    }

    async fn set_current_by_dedup_chain_id(&mut self, dedup_chain_id: NetworkId) -> Result<()> {
        let new_network = self
            .inner
            .networks
            .values()
            .find(|n| n.dedup_chain_id() == dedup_chain_id)
            .wrap_err_with(|| {
                format!("Network with dedup_chain_id {dedup_chain_id:?} not found")
            })?;

        self.set_current_by_name(new_network.name.clone()).await?;
        self.save()?;
        Ok(())
    }

    async fn add_network(&mut self, network: NewNetworkParams) -> Result<()> {
        if self.inner.networks.contains_key(&network.name) {
            return Err(eyre!("Already exists"));
        }

        let deduplication_id = self.get_chain_id_count(network.chain_id) as u32;
        let network = network.into_network(deduplication_id);

        if !network.is_dev().await
            & self
                .get_network_by_dedup_chain_id(network.dedup_chain_id())
                .is_some()
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

    async fn update_network(&mut self, old_name: &str, network: Network) -> Result<()> {
        if network.name != old_name && self.inner.networks.contains_key(&network.name) {
            return Err(eyre!("Already exists"));
        }

        self.inner.networks.remove(old_name);
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

    async fn remove_network(&mut self, name: &str) -> Result<()> {
        let network = self.inner.networks.remove(name);

        match network {
            Some(network) => {
                if self.inner.current == name {
                    let first = self
                        .inner
                        .networks
                        .values()
                        .next()
                        .wrap_err_with(|| "No networks remaining")?;
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
}

impl Actor for NetworksActor {
    type Args = PathBuf;
    type Error = color_eyre::Report;

    async fn on_start(
        args: Self::Args,
        actor_ref: ActorRef<Self>,
    ) -> std::result::Result<Self, Self::Error> {
        let actor = Self::new(args)?;
        actor.broadcast_init().await;

        tokio::spawn(receiver(actor_ref.downgrade()));
        tokio::spawn(status_poller(actor_ref.downgrade()));

        Ok(actor)
    }

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> std::result::Result<std::ops::ControlFlow<ActorStopReason>, Self::Error> {
        error!("ethui_networks panic: {}", err);
        Ok(std::ops::ControlFlow::Continue(()))
    }
}

// Message types
#[derive(Debug, Clone)]
pub struct GetCurrent;

#[derive(Debug, Clone)]
pub struct GetList;

#[derive(Debug, Clone)]
pub struct GetNetwork(pub u32);

#[derive(Debug, Clone)]
pub struct GetNetworkByName(pub String);

#[derive(Debug, Clone)]
pub struct GetNetworkByDedupChainId(pub NetworkId);

#[derive(Debug, Clone)]
pub struct AddNetwork(pub NewNetworkParams);

#[derive(Debug, Clone)]
pub struct UpdateNetwork(pub String, pub Network);

#[derive(Debug, Clone)]
pub struct RemoveNetwork(pub String);

#[derive(Debug, Clone)]
pub struct SetCurrentByName(pub String);

#[derive(Debug, Clone)]
pub struct SetCurrentById(pub u32);

#[derive(Debug, Clone)]
pub struct SetCurrentByDedupChainId(pub NetworkId);

#[derive(Debug, Clone)]
pub struct GetLowestDedupId(pub u32);

#[derive(Debug, Clone)]
pub struct IsDev(pub NetworkId);

#[derive(Debug, Clone)]
pub struct ValidateChainId(pub u32);

#[derive(Debug, Clone)]
pub struct ChainIdFromProvider(pub String);

#[derive(Debug, Clone)]
pub struct UpdateNetworkStatus(pub String, pub Network);

// Message implementations
impl Message<GetCurrent> for NetworksActor {
    type Reply = Result<Network>;

    async fn handle(
        &mut self,
        _msg: GetCurrent,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.get_current().clone())
    }
}

impl Message<GetList> for NetworksActor {
    type Reply = Result<Vec<Network>>;

    async fn handle(
        &mut self,
        _msg: GetList,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.inner.networks.values().cloned().collect())
    }
}

impl Message<GetNetwork> for NetworksActor {
    type Reply = Result<Option<Network>>;

    async fn handle(
        &mut self,
        GetNetwork(chain_id): GetNetwork,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.get_network(chain_id).cloned())
    }
}

impl Message<GetNetworkByName> for NetworksActor {
    type Reply = Result<Option<Network>>;

    async fn handle(
        &mut self,
        GetNetworkByName(name): GetNetworkByName,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.get_network_by_name(&name).cloned())
    }
}

impl Message<GetNetworkByDedupChainId> for NetworksActor {
    type Reply = Result<Option<Network>>;

    async fn handle(
        &mut self,
        GetNetworkByDedupChainId(id): GetNetworkByDedupChainId,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.get_network_by_dedup_chain_id(id).cloned())
    }
}

impl Message<AddNetwork> for NetworksActor {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        AddNetwork(params): AddNetwork,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.add_network(params).await
    }
}

impl Message<UpdateNetwork> for NetworksActor {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        UpdateNetwork(old_name, network): UpdateNetwork,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.update_network(&old_name, network).await
    }
}

impl Message<RemoveNetwork> for NetworksActor {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        RemoveNetwork(name): RemoveNetwork,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.remove_network(&name).await
    }
}

impl Message<SetCurrentByName> for NetworksActor {
    type Reply = Result<Network>;

    async fn handle(
        &mut self,
        SetCurrentByName(name): SetCurrentByName,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.set_current_by_name(name).await?;
        Ok(self.get_current().clone())
    }
}

impl Message<SetCurrentById> for NetworksActor {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        SetCurrentById(chain_id): SetCurrentById,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.set_current_by_id(chain_id).await
    }
}

impl Message<SetCurrentByDedupChainId> for NetworksActor {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        SetCurrentByDedupChainId(id): SetCurrentByDedupChainId,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.set_current_by_dedup_chain_id(id).await
    }
}

impl Message<GetLowestDedupId> for NetworksActor {
    type Reply = Result<u32>;

    async fn handle(
        &mut self,
        GetLowestDedupId(chain_id): GetLowestDedupId,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.get_lowest_dedup_id(chain_id))
    }
}

impl Message<IsDev> for NetworksActor {
    type Reply = Result<bool>;

    async fn handle(
        &mut self,
        IsDev(id): IsDev,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        let network = self
            .get_network_by_dedup_chain_id(id)
            .ok_or_else(|| eyre!("Network not found"))?;
        Ok(network.is_dev().await)
    }
}

impl Message<ValidateChainId> for NetworksActor {
    type Reply = Result<bool>;

    async fn handle(
        &mut self,
        ValidateChainId(chain_id): ValidateChainId,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok(self.validate_chain_id(chain_id))
    }
}

impl Message<ChainIdFromProvider> for NetworksActor {
    type Reply = Result<u64>;

    async fn handle(
        &mut self,
        ChainIdFromProvider(url): ChainIdFromProvider,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        use alloy::providers::{Provider, ProviderBuilder};

        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(&url)
            .await
            .with_context(|| format!("Failed to connect to provider at {url}"))?;

        provider
            .get_chain_id()
            .await
            .with_context(|| format!("Failed to get chain ID from provider at {url}"))
    }
}

impl Message<UpdateNetworkStatus> for NetworksActor {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        UpdateNetworkStatus(key, network): UpdateNetworkStatus,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.inner.networks.insert(key, network);
        self.save()?;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
        Ok(())
    }
}

async fn receiver(actor_ref: WeakActorRef<NetworksActor>) {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            let Some(actor) = actor_ref.upgrade() else {
                break;
            };

            use InternalMsg::*;

            match msg {
                ChainChanged(dedup_chain_id, _domain, affinity) => {
                    ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
                    if affinity.is_global() || affinity.is_unset() {
                        let _ = actor.ask(SetCurrentByDedupChainId(dedup_chain_id)).await;
                    }
                }
                StackAdd(params) => {
                    let _ = actor.ask(AddNetwork(params)).await;
                }
                StackRemove(name) => {
                    let _ = actor.ask(RemoveNetwork(name)).await;
                }
                _ => {}
            }
        }
    }
}

async fn status_poller(actor_ref: WeakActorRef<NetworksActor>) {
    let mut interval = interval(Duration::from_secs(10));
    loop {
        interval.tick().await;

        let Some(actor) = actor_ref.upgrade() else {
            break;
        };

        // Get networks list
        let networks_to_poll: Vec<(String, Network)> = match actor.ask(GetList).await {
            Ok(networks) => networks
                .into_iter()
                .map(|n| (n.name.clone(), n))
                .collect(),
            _ => continue,
        };

        let poll_results: Vec<(String, Network, Option<NetworkStatus>)> =
            stream::iter(networks_to_poll)
                .map(|(key, mut network): (String, Network)| async move {
                    let result = timeout(Duration::from_secs(2), network.poll_status())
                        .await
                        .unwrap_or_default();
                    (key, network, result)
                })
                .buffer_unordered(64)
                .collect::<Vec<_>>()
                .await;

        let any_changes = poll_results.iter().any(|(_, _, change)| change.is_some());

        if any_changes {
            for (key, updated_network, change) in poll_results {
                if change.is_some() {
                    let _ = actor
                        .ask(UpdateNetworkStatus(key, updated_network))
                        .await;
                }
            }
        }
    }
}

pub fn get_current_provider() -> Result<RootProvider<Ethereum>> {
    // This is a sync helper, but we need async to get current network
    // This should only be used where we have the network already
    Err(eyre!(
        "Use get_provider(chain_id) or ask(GetCurrent) instead"
    ))
}
