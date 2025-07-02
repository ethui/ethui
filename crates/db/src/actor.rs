use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use kameo::{actor::ActorRef, message::Message, Actor};

use crate::{Db, DbInner};

pub struct DbActor {
    inner: Db,
}

impl DbActor {
    pub async fn new(path: &PathBuf) -> color_eyre::Result<Self> {
        let inner = std::sync::Arc::new(DbInner::connect(path).await?);
        Ok(Self { inner })
    }

    pub fn db(&self) -> &Db {
        &self.inner
    }
}

pub enum Msg {
    Get,
    NetworkRemoved(ethui_types::Network),
}

impl Message<Msg> for DbActor {
    type Reply = Db;

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::Get => self.inner.clone(),
            Msg::NetworkRemoved(network) => {
                let _ = self
                    .inner
                    .remove_contracts(network.chain_id(), network.dedup_chain_id().dedup_id())
                    .await;
                let _ = self.inner.remove_transactions(network.chain_id()).await;
                self.inner.clone()
            }
        }
    }
}

impl Actor for DbActor {
    type Error = color_eyre::Report;

    async fn on_start(
        &mut self,
        actor_ref: ActorRef<Self>,
    ) -> std::result::Result<(), Self::Error> {
        tokio::spawn(async move { receiver(actor_ref).await });
        Ok(())
    }
}

async fn receiver(handle: ActorRef<DbActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let NetworkRemoved(network) = msg {
                let _ = handle.ask(Msg::NetworkRemoved(network)).await;
            }
        }
    }
}