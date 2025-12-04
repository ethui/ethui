mod ext;

use std::{
    collections::HashSet,
    fs::File,
    io::BufReader,
    ops::ControlFlow,
    path::{Path, PathBuf},
};

use color_eyre::eyre::eyre;
use ethui_types::{Address, Json, UINotify};
pub use ext::WalletsActorExt;
use kameo::prelude::*;
use serde::{Deserialize, Serialize};
use tracing::{error, trace};

use crate::{Wallet, WalletControl, wallets::PlaintextWallet};

// Wrapper types for kameo Reply trait
#[derive(Debug, Clone, kameo::Reply)]
pub struct AddressReply(pub Address);

#[derive(Debug, Clone, kameo::Reply)]
pub struct AddressesReply(pub Vec<(String, Address)>);

#[derive(Debug, Clone, kameo::Reply)]
pub struct FindWalletReply(pub Option<(Wallet, String)>);

#[derive(Debug, Serialize)]
pub struct WalletsActor {
    wallets: Vec<Wallet>,

    #[serde(default)]
    current: usize,

    #[serde(skip)]
    file: PathBuf,
}

pub fn wallets() -> ActorRef<WalletsActor> {
    try_wallets().expect("wallets actor not initialized")
}

pub fn try_wallets() -> color_eyre::Result<ActorRef<WalletsActor>> {
    ActorRef::<WalletsActor>::lookup("wallets")?
        .ok_or_else(|| color_eyre::eyre::eyre!("wallets actor not found"))
}

impl Actor for WalletsActor {
    type Args = PathBuf;
    type Error = color_eyre::Report;

    async fn on_start(args: Self::Args, _actor_ref: ActorRef<Self>) -> color_eyre::Result<Self> {
        let pathbuf = args;
        let path = Path::new(&pathbuf);

        #[derive(Debug, Deserialize)]
        struct PersistedWallets {
            wallets: Vec<Wallet>,
            #[serde(default)]
            current: usize,
        }

        let mut actor: WalletsActor = if path.exists() {
            let file = File::open(path)?;
            let reader = BufReader::new(file);

            let res: PersistedWallets = serde_json::from_reader(reader)?;

            WalletsActor {
                wallets: res.wallets,
                current: res.current,
                file: pathbuf,
            }
        } else {
            WalletsActor {
                wallets: Default::default(),
                current: 0,
                file: pathbuf,
            }
        };

        actor.ensure_current();
        actor.init_broadcast().await;

        Ok(actor)
    }

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> color_eyre::Result<ControlFlow<ActorStopReason>> {
        error!("wallets actor panic: {}", err);
        Ok(ControlFlow::Continue(()))
    }
}

#[messages]
impl WalletsActor {
    // Helper methods (no #[message])

    fn get_current_wallet_inner(&self) -> &Wallet {
        &self.wallets[self.current]
    }

    fn get_inner(&self, name: &str) -> Option<&Wallet> {
        self.wallets.iter().find(|w| w.name() == name)
    }

    fn save(&self) -> color_eyre::Result<()> {
        let path = Path::new(&self.file);
        let file = File::create(path)?;
        serde_json::to_writer_pretty(file, self)?;
        Ok(())
    }

    fn ensure_current(&mut self) {
        if self.wallets.is_empty() {
            self.wallets.push(Wallet::Plaintext(PlaintextWallet::default()));
        }

        if self.current >= self.wallets.len() {
            self.current = 0;
        }
    }

    async fn init_broadcast(&self) {
        for wallet in self.wallets.iter() {
            for (_, addr) in wallet.get_all_addresses().await {
                ethui_broadcast::address_added(addr).await;
            }
        }

        let addr = self.get_current_wallet_inner().get_current_address().await;
        ethui_broadcast::current_address_changed(addr).await;
    }

    async fn on_wallet_changed(&self) -> color_eyre::Result<()> {
        let addr = self.get_current_wallet_inner().get_current_address().await;

        self.notify_peers().await;
        ethui_broadcast::ui_notify(UINotify::WalletsChanged).await;
        ethui_broadcast::current_address_changed(addr).await;

        Ok(())
    }

    async fn notify_peers(&self) {
        let addresses = vec![self.get_current_wallet_inner().get_current_address().await];
        ethui_broadcast::accounts_changed(addresses).await;
    }

    fn ensure_no_duplicates_of(&self, name: &str) -> color_eyre::Result<()> {
        if self.wallets.iter().any(|w| w.name() == name) {
            return Err(eyre!("duplicate wallet names `{}`", name));
        }
        Ok(())
    }

    // Message handlers

    #[message]
    #[tracing::instrument(skip(self))]
    fn get_all(&self) -> Vec<Wallet> {
        trace!("");
        self.wallets.clone()
    }

    #[message]
    #[tracing::instrument(skip(self))]
    fn get_current(&self) -> Wallet {
        trace!("");
        self.get_current_wallet_inner().clone()
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn get_current_address(&self) -> AddressReply {
        trace!("");
        AddressReply(self.get_current_wallet_inner().get_current_address().await)
    }

    #[message]
    #[tracing::instrument(skip(self))]
    fn get(&self, name: String) -> Option<Wallet> {
        trace!("");
        self.get_inner(&name).cloned()
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn find(&self, address: AddressReply) -> FindWalletReply {
        trace!("");
        for w in self.wallets.iter() {
            if let Some(path) = w.find(address.0).await {
                return FindWalletReply(Some((w.clone(), path)));
            }
        }
        FindWalletReply(None)
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn get_all_addresses(&self) -> AddressesReply {
        trace!("");
        let mut res = vec![];
        for wallet in self.wallets.iter() {
            res.extend(wallet.get_all_addresses().await.into_iter());
        }
        AddressesReply(res)
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn get_wallet_addresses(&self, name: String) -> AddressesReply {
        trace!("");
        match self.get_inner(&name) {
            Some(wallet) => AddressesReply(wallet.get_all_addresses().await),
            None => AddressesReply(vec![]),
        }
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn create(&mut self, params: Json) -> color_eyre::Result<()> {
        trace!("");
        let wallet = Wallet::create(params).await?;
        let addresses = wallet.get_all_addresses().await;

        self.ensure_no_duplicates_of(&wallet.name())?;

        self.wallets.push(wallet);

        self.on_wallet_changed().await?;
        self.save()?;

        ethui_broadcast::wallet_created().await;

        for (_, a) in addresses {
            ethui_broadcast::address_added(a).await;
        }

        Ok(())
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn update(&mut self, name: String, params: Json) -> color_eyre::Result<()> {
        trace!("");
        let i = self
            .wallets
            .iter()
            .position(|w| w.name() == name)
            .ok_or_else(|| eyre!("invalid wallet name `{name}`"))?;

        let before = self.wallets[i].get_all_addresses().await;
        self.wallets[i] = self.wallets[i].clone().update(params).await?;
        let after = self.wallets[i].get_all_addresses().await;

        tokio::spawn(async move {
            let before: HashSet<_> = before.into_iter().collect();
            let after: HashSet<_> = after.into_iter().collect();
            for (_, a) in after.difference(&before) {
                ethui_broadcast::address_added(*a).await;
            }
            for (_, a) in before.difference(&after) {
                ethui_broadcast::address_removed(*a).await;
            }
        });

        self.ensure_current();
        self.notify_peers().await;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn remove(&mut self, name: String) -> color_eyre::Result<()> {
        trace!("");
        let found = self
            .wallets
            .iter()
            .enumerate()
            .find(|(_, w)| w.name() == name);

        if let Some((i, _)) = found {
            let removed = self.wallets.remove(i);

            for (_, a) in removed.get_all_addresses().await {
                ethui_broadcast::address_removed(a).await;
            }

            self.ensure_current();
            self.on_wallet_changed().await?;
            self.save()?;
        }

        Ok(())
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn set_current_wallet(&mut self, idx: usize) -> color_eyre::Result<()> {
        trace!("");
        if idx >= self.wallets.len() {
            return Err(eyre!("invalid wallet index {}", idx));
        }

        self.current = idx;
        self.on_wallet_changed().await?;

        let wallet_type = self.wallets[idx].wallet_type();
        ethui_broadcast::wallet_connected(wallet_type.to_string()).await;

        self.save()?;
        Ok(())
    }

    #[message]
    #[tracing::instrument(skip(self))]
    async fn set_current_path(&mut self, key: String) -> color_eyre::Result<()> {
        trace!("");
        self.wallets[self.current].set_current_path(key).await?;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }
}
