use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_types::{DedupChainId, GlobalState, Network, NewNetworkParams, UINotify};
use kameo::{actor::ActorRef, message::Message, Actor};
use serde_constant::ConstI64;
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};

use crate::{Networks, SerializedNetworks};

pub struct NetworksActor {
    inner: Networks,
}

impl NetworksActor {
    pub async fn new(pathbuf: PathBuf) -> Self {
        let res: Networks = if pathbuf.exists() {
            crate::migrations::load_and_migrate(&pathbuf).expect("failed to load networks")
        } else {
            let networks = Network::all_default();
            let current = networks[0].name.clone();

            Networks {
                inner: SerializedNetworks {
                    networks: networks.into_iter().map(|n| (n.name.clone(), n)).collect(),
                    current,
                    version: ConstI64,
                },
                file: pathbuf,
            }
        };

        res.broadcast_init().await;
        Self { inner: res }
    }
}

pub enum Msg {
    Read,
    Write,
    SetCurrentByName(String),
    SetCurrentById(u32),
    SetCurrentByDedupChainId(DedupChainId),
    AddNetwork(NewNetworkParams),
    UpdateNetwork(String, Network),
    RemoveNetwork(String),
    ChainChanged(DedupChainId, Option<String>, ethui_types::Affinity),
}

impl Message<Msg> for NetworksActor {
    type Reply = Result<Networks, color_eyre::Report>;

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::Read => Ok(self.inner.clone()),
            Msg::Write => Ok(self.inner.clone()),
            Msg::SetCurrentByName(name) => {
                self.inner.set_current_by_name(name).await?;
                Ok(self.inner.clone())
            }
            Msg::SetCurrentById(id) => {
                self.inner.set_current_by_id(id).await?;
                Ok(self.inner.clone())
            }
            Msg::SetCurrentByDedupChainId(id) => {
                self.inner.set_current_by_dedup_chain_id(id).await?;
                Ok(self.inner.clone())
            }
            Msg::AddNetwork(params) => {
                self.inner.add_network(params).await?;
                Ok(self.inner.clone())
            }
            Msg::UpdateNetwork(old_name, network) => {
                self.inner.update_network(&old_name, network).await?;
                Ok(self.inner.clone())
            }
            Msg::RemoveNetwork(name) => {
                self.inner.remove_network(&name).await?;
                Ok(self.inner.clone())
            }
            Msg::ChainChanged(dedup_chain_id, _domain, affinity) => {
                ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
                if affinity.is_global() || affinity.is_unset() {
                    self.inner.set_current_by_dedup_chain_id(dedup_chain_id).await?;
                }
                Ok(self.inner.clone())
            }
        }
    }
}

impl Actor for NetworksActor {
    type Error = color_eyre::Report;

    async fn on_start(
        &mut self,
        actor_ref: ActorRef<Self>,
    ) -> std::result::Result<(), Self::Error> {
        tokio::spawn(async move { receiver(actor_ref).await });
        Ok(())
    }
}

async fn receiver(handle: ActorRef<NetworksActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let ChainChanged(dedup_chain_id, domain, affinity) = msg {
                let _ = handle.tell(Msg::ChainChanged(dedup_chain_id, domain, affinity)).await;
            }
        }
    }
}

// Provide a compatibility layer for GlobalState
impl GlobalState for Networks {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        unimplemented!("Use NetworksActor instead")
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        unimplemented!("Use NetworksActor instead")
    }
}

// Helper functions for external access
pub async fn get_networks() -> Networks {
    let handle: ActorRef<NetworksActor> = kameo::registry::get("networks").await.unwrap();
    handle.ask(Msg::Read).await.unwrap().unwrap()
}