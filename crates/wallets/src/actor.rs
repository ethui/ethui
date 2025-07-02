use std::path::PathBuf;

use ethui_types::{Address, GlobalState, Json};
use kameo::{actor::ActorRef, message::Message, Actor};
use tokio::sync::{RwLockReadGuard, RwLockWriteGuard};

use crate::{Wallet, Wallets};

pub struct WalletsActor {
    inner: Wallets,
}

impl WalletsActor {
    pub async fn new(pathbuf: PathBuf) -> Self {
        let mut res: Wallets = if pathbuf.exists() {
            let file = std::fs::File::open(&pathbuf).unwrap();
            let reader = std::io::BufReader::new(file);

            #[derive(serde::Deserialize)]
            struct PersistedWallets {
                wallets: Vec<Wallet>,
                #[serde(default)]
                current: usize,
            }

            let res: PersistedWallets = serde_json::from_reader(reader).unwrap();

            Wallets {
                wallets: res.wallets,
                current: res.current,
                file: Some(pathbuf),
            }
        } else {
            Wallets {
                wallets: Default::default(),
                current: 0,
                file: Some(pathbuf),
            }
        };

        res.ensure_current();
        res.init_broadcast().await;
        Self { inner: res }
    }
}

pub enum Msg {
    Read,
    Write,
    SetCurrentPath(String),
    SetCurrentWallet(usize),
    Create(Json),
    Update(String, Json),
    Remove(String),
    GetWalletAddresses(String),
    GetAllAddresses,
    Find(Address),
}

#[derive(Debug)]
pub enum Reply {
    ReadGuard(Wallets),
    WriteGuard(Wallets),
    Ok,
    Error(color_eyre::Report),
    Addresses(Vec<(String, Address)>),
    FindResult(Option<(Wallet, String)>),
}

impl Message<Msg> for WalletsActor {
    type Reply = Reply;

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::Read => Reply::ReadGuard(self.inner.clone()),
            Msg::Write => Reply::WriteGuard(self.inner.clone()),
            Msg::SetCurrentPath(key) => {
                match self.inner.set_current_path(key).await {
                    Ok(_) => Reply::Ok,
                    Err(e) => Reply::Error(e),
                }
            }
            Msg::SetCurrentWallet(id) => {
                match self.inner.set_current_wallet(id).await {
                    Ok(_) => Reply::Ok,
                    Err(e) => Reply::Error(e),
                }
            }
            Msg::Create(params) => {
                match self.inner.create(params).await {
                    Ok(_) => Reply::Ok,
                    Err(e) => Reply::Error(e),
                }
            }
            Msg::Update(name, params) => {
                match self.inner.update(name, params).await {
                    Ok(_) => Reply::Ok,
                    Err(e) => Reply::Error(e),
                }
            }
            Msg::Remove(name) => {
                match self.inner.remove(name).await {
                    Ok(_) => Reply::Ok,
                    Err(e) => Reply::Error(e),
                }
            }
            Msg::GetWalletAddresses(name) => {
                let addresses = self.inner.get_wallet_addresses(name).await;
                Reply::Addresses(addresses)
            }
            Msg::GetAllAddresses => {
                let addresses = self.inner.get_all_addresses().await;
                Reply::Addresses(addresses)
            }
            Msg::Find(address) => {
                if let Some((wallet, path)) = self.inner.find(address).await {
                    Reply::FindResult(Some((wallet.clone(), path)))
                } else {
                    Reply::FindResult(None)
                }
            }
        }
    }
}

impl Actor for WalletsActor {
    type Error = color_eyre::Report;
}

// Provide a compatibility layer for GlobalState
impl GlobalState for Wallets {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        unimplemented!("Use WalletsActor instead")
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        unimplemented!("Use WalletsActor instead")
    }
}

// Helper functions for external access
pub async fn get_wallets() -> Wallets {
    let handle: ActorRef<WalletsActor> = kameo::registry::get("wallets").await.unwrap();
    match handle.ask(Msg::Read).await.unwrap() {
        Reply::ReadGuard(wallets) => wallets,
        _ => unreachable!(),
    }
}