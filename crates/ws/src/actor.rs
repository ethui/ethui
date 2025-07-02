use ethui_broadcast::InternalMsg;
use ethui_types::{Address, GlobalState};
use kameo::{actor::ActorRef, message::Message, Actor};
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};

use crate::peers::Peers;

pub struct PeersActor {
    inner: Peers,
}

impl PeersActor {
    pub fn new() -> Self {
        Self {
            inner: Peers::default(),
        }
    }
}

impl Default for PeersActor {
    fn default() -> Self {
        Self::new()
    }
}

pub enum Msg {
    Read,
    Write,
    BroadcastChainChanged(ethui_types::DedupChainId, Option<String>, ethui_types::Affinity),
    BroadcastAccountsChanged(Vec<Address>),
}

#[derive(Debug)]
pub enum Reply {
    ReadGuard(Peers),
    WriteGuard(Peers),
    Ok,
}

impl Message<Msg> for PeersActor {
    type Reply = Reply;

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::Read => Reply::ReadGuard(self.inner.clone()),
            Msg::Write => Reply::WriteGuard(self.inner.clone()),
            Msg::BroadcastChainChanged(internal_id, domain, affinity) => {
                self.inner
                    .broadcast_chain_changed(internal_id, domain, affinity)
                    .await;
                Reply::Ok
            }
            Msg::BroadcastAccountsChanged(accounts) => {
                self.inner.broadcast_accounts_changed(accounts);
                Reply::Ok
            }
        }
    }
}

impl Actor for PeersActor {
    type Error = color_eyre::Report;

    async fn on_start(
        &mut self,
        actor_ref: ActorRef<Self>,
    ) -> std::result::Result<(), Self::Error> {
        tokio::spawn(async move { receiver(actor_ref).await });
        Ok(())
    }
}

async fn receiver(handle: ActorRef<PeersActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(internal_id, domain, affinity) => {
                    let _ = handle.ask(Msg::BroadcastChainChanged(internal_id, domain, affinity)).await;
                }
                AccountsChanged(accounts) => {
                    let _ = handle.ask(Msg::BroadcastAccountsChanged(accounts)).await;
                }
                _ => {}
            }
        }
    }
}

// Provide a compatibility layer for GlobalState
impl GlobalState for Peers {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        unimplemented!("Use PeersActor instead")
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        unimplemented!("Use PeersActor instead")
    }
}

// Helper functions for external access
pub async fn get_peers() -> Peers {
    let handle: ActorRef<PeersActor> = kameo::registry::get("peers").await.unwrap();
    match handle.ask(Msg::Read).await.unwrap() {
        Reply::ReadGuard(peers) => peers,
        _ => unreachable!(),
    }
}