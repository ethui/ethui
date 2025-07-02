use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_types::{Affinity, DedupChainId, GlobalState};
use kameo::{actor::ActorRef, message::Message, Actor};
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};

use crate::Store;

pub struct StoreActor {
    inner: Store,
}

impl StoreActor {
    pub async fn new(pathbuf: PathBuf) -> Self {
        let store: Store = if pathbuf.exists() {
            crate::migrations::load_and_migrate(&pathbuf).expect("failed to load connections")
        } else {
            Store {
                file: pathbuf,
                ..Default::default()
            }
        };

        Self { inner: store }
    }
}

pub enum Msg {
    Read,
    Write,
    GetAffinity(String),
    SetAffinity(String, Affinity),
    OnChainRemoved(DedupChainId),
}

#[derive(Debug)]
pub enum Reply {
    ReadGuard(Store),
    WriteGuard(Store),
    Affinity(Affinity),
    Ok,
    Error(color_eyre::Report),
}

impl Message<Msg> for StoreActor {
    type Reply = Reply;

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::Read => Reply::ReadGuard(self.inner.clone()),
            Msg::Write => Reply::WriteGuard(self.inner.clone()),
            Msg::GetAffinity(domain) => {
                let affinity = self.inner.get_affinity(&domain);
                Reply::Affinity(affinity)
            }
            Msg::SetAffinity(domain, affinity) => {
                match self.inner.set_affinity(&domain, affinity) {
                    Ok(_) => Reply::Ok,
                    Err(e) => Reply::Error(e),
                }
            }
            Msg::OnChainRemoved(chain_id) => {
                self.inner.on_chain_removed(chain_id);
                Reply::Ok
            }
        }
    }
}

impl Actor for StoreActor {
    type Error = color_eyre::Report;

    async fn on_start(
        &mut self,
        actor_ref: ActorRef<Self>,
    ) -> std::result::Result<(), Self::Error> {
        tokio::spawn(async move { receiver(actor_ref).await });
        Ok(())
    }
}

async fn receiver(handle: ActorRef<StoreActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let NetworkRemoved(network) = msg {
                let _ = handle.ask(Msg::OnChainRemoved(network.dedup_chain_id())).await;
            }
        }
    }
}

// Provide a compatibility layer for GlobalState
impl GlobalState for Store {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        unimplemented!("Use StoreActor instead")
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        unimplemented!("Use StoreActor instead")
    }
}

// Helper functions for external access
pub async fn get_store() -> Store {
    let handle: ActorRef<StoreActor> = kameo::registry::get("connections_store").await.unwrap();
    match handle.ask(Msg::Read).await.unwrap() {
        Reply::ReadGuard(store) => store,
        _ => unreachable!(),
    }
}