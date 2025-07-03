use std::{
    collections::HashSet,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use ethui_types::{Address, Json, UINotify};
use kameo::{message::Message, Actor, ActorRef};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use super::{Wallet, Wallets};

#[derive(Debug)]
pub struct WalletsActor {
    inner: Wallets,
    file: PathBuf,
}

impl WalletsActor {
    pub async fn new(file: PathBuf) -> color_eyre::Result<Self> {
        let path = Path::new(&file);

        #[derive(Debug, Deserialize)]
        struct PersistedWallets {
            wallets: Vec<Wallet>,
            #[serde(default)]
            current: usize,
        }

        let mut inner: Wallets = if path.exists() {
            let file_handle = File::open(path)?;
            let reader = BufReader::new(file_handle);

            let res: PersistedWallets = serde_json::from_reader(reader)?;

            Wallets {
                wallets: res.wallets,
                current: res.current,
                file: Some(file.clone()),
            }
        } else {
            Wallets {
                wallets: Default::default(),
                current: 0,
                file: Some(file.clone()),
            }
        };

        inner.ensure_current();
        inner.init_broadcast().await;

        Ok(Self { inner, file })
    }

    fn save(&self) -> color_eyre::Result<()> {
        let path = Path::new(&self.file);
        let file_handle = File::create(path)?;
        serde_json::to_writer_pretty(file_handle, &self.inner)?;
        Ok(())
    }
}

impl Actor for WalletsActor {}

// Message types
#[derive(Debug)]
pub struct GetAll;

#[derive(Debug)]
pub struct GetCurrent;

#[derive(Debug)]
pub struct GetCurrentAddress;

#[derive(Debug)]
pub struct Create {
    pub params: Json,
}

#[derive(Debug)]
pub struct Update {
    pub name: String,
    pub params: Json,
}

#[derive(Debug)]
pub struct Remove {
    pub name: String,
}

#[derive(Debug)]
pub struct SetCurrentWallet {
    pub idx: usize,
}

#[derive(Debug)]
pub struct SetCurrentPath {
    pub key: String,
}

#[derive(Debug)]
pub struct GetWalletAddresses {
    pub name: String,
}

#[derive(Debug)]
pub struct Find {
    pub address: Address,
}

#[derive(Debug)]
pub struct GetAllAddresses;

// Message implementations
impl Message<GetAll> for WalletsActor {
    type Reply = Vec<Wallet>;

    async fn handle(&mut self, _msg: GetAll, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        self.inner.get_all().clone()
    }
}

impl Message<GetCurrent> for WalletsActor {
    type Reply = Wallet;

    async fn handle(&mut self, _msg: GetCurrent, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        self.inner.get_current_wallet().clone()
    }
}

impl Message<GetCurrentAddress> for WalletsActor {
    type Reply = Address;

    async fn handle(&mut self, _msg: GetCurrentAddress, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        self.inner.get_current_address().await
    }
}

impl Message<Create> for WalletsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(&mut self, msg: Create, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        let result = self.inner.create(msg.params).await;
        if result.is_ok() {
            self.save()?;
        }
        result
    }
}

impl Message<Update> for WalletsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(&mut self, msg: Update, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        let result = self.inner.update(msg.name, msg.params).await;
        if result.is_ok() {
            self.save()?;
        }
        result
    }
}

impl Message<Remove> for WalletsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(&mut self, msg: Remove, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        let result = self.inner.remove(msg.name).await;
        if result.is_ok() {
            self.save()?;
        }
        result
    }
}

impl Message<SetCurrentWallet> for WalletsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(&mut self, msg: SetCurrentWallet, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        let result = self.inner.set_current_wallet(msg.idx).await;
        if result.is_ok() {
            self.save()?;
        }
        result
    }
}

impl Message<SetCurrentPath> for WalletsActor {
    type Reply = color_eyre::Result<()>;

    async fn handle(&mut self, msg: SetCurrentPath, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        let result = self.inner.set_current_path(msg.key).await;
        if result.is_ok() {
            self.save()?;
        }
        result
    }
}

impl Message<GetWalletAddresses> for WalletsActor {
    type Reply = Vec<(String, Address)>;

    async fn handle(&mut self, msg: GetWalletAddresses, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        self.inner.get_wallet_addresses(msg.name).await
    }
}

impl Message<Find> for WalletsActor {
    type Reply = Option<(Wallet, String)>;

    async fn handle(&mut self, msg: Find, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        self.inner.find(msg.address).await.map(|(w, s)| (w.clone(), s))
    }
}

impl Message<GetAllAddresses> for WalletsActor {
    type Reply = Vec<(String, Address)>;

    async fn handle(&mut self, msg: GetAllAddresses, _ctx: kameo::Context<'_, Self>) -> Self::Reply {
        self.inner.get_all_addresses().await
    }
}

// Convenience functions for external use
pub async fn ask<M>(msg: M) -> color_eyre::Result<M::Reply>
where
    WalletsActor: Message<M>,
    M: Send + 'static,
{
    let actor = ActorRef::<WalletsActor>::lookup("wallets")?;
    Ok(actor.ask(msg).await?)
}

pub async fn tell<M>(msg: M) -> color_eyre::Result<()>
where
    WalletsActor: Message<M>,
    M: Send + 'static,
{
    let actor = ActorRef::<WalletsActor>::lookup("wallets")?;
    actor.tell(msg).await?;
    Ok(())
}