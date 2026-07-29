pub mod commands;
mod init;
pub(crate) mod secret_cache;
mod signer;
mod utils;
mod wallet;
mod wallets;

use std::{
    collections::HashSet,
    fs::File,
    path::{Path, PathBuf},
};

use color_eyre::eyre::{ContextCompat as _, eyre};
use ethui_types::{Address, GlobalState, Json, UINotify};
pub use init::init;
use serde::Serialize;
pub use signer::Signer;

pub use self::wallet::{Wallet, WalletControl, WalletType};

pub async fn find_wallet(address: Address) -> Option<(Wallet, String)> {
    let wallets = Wallets::read().await;
    wallets
        .find(address)
        .await
        .map(|(wallet, path)| (wallet.clone(), path))
}

pub async fn get_current_wallet() -> Wallet {
    Wallets::read().await.get_current_wallet().clone()
}

/// Maintains a list of Ethereum wallets, including keeping track of the global current wallet &
/// address
#[derive(Debug, Serialize)]
pub struct Wallets {
    wallets: Vec<Wallet>,

    #[serde(default)]
    current: usize,

    #[serde(skip)]
    file: Option<PathBuf>,
}

impl Wallets {
    pub async fn find(&self, address: Address) -> Option<(&Wallet, String)> {
        for w in self.wallets.iter() {
            if let Some(path) = w.find(address).await {
                return Some((w, path));
            }
        }

        None
    }

    /// Gets a reference the current default wallet
    pub fn get_current_wallet(&self) -> &Wallet {
        &self.wallets[self.current]
    }

    pub fn get(&self, name: &str) -> Option<&Wallet> {
        self.wallets.iter().find(|w| w.name() == name)
    }

    /// Sets the current key within the current default
    ///
    /// Since wallets actually contain multiple addresses, we need the ability to connect to a
    /// different one within the same wallet
    async fn set_current_path(&mut self, key: String) -> color_eyre::Result<()> {
        self.wallets[self.current].set_current_path(key).await?;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn get_current_address(&self) -> Address {
        self.get_current_wallet().get_current_address().await
    }

    /// Switches the current default wallet
    async fn set_current_wallet(&mut self, id: usize) -> color_eyre::Result<()> {
        if id >= self.wallets.len() {
            return Err(eyre!("invalid wallet index {}", id));
        }

        self.current = id;
        self.on_wallet_changed().await?;

        let wallet_type = self.wallets[id].wallet_type();
        ethui_broadcast::wallet_connected(wallet_type.to_string()).await;

        self.save()?;
        Ok(())
    }

    /// Retrieves all wallets
    fn get_all(&self) -> &Vec<Wallet> {
        &self.wallets
    }

    pub async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        let mut res = vec![];
        for wallet in self.wallets.iter() {
            res.extend(wallet.get_all_addresses().await);
        }

        res
    }

    async fn create(&mut self, params: Json) -> color_eyre::Result<()> {
        let wallet = Wallet::create(params).await?;
        let addresses = wallet.get_all_addresses().await;

        self.ensure_no_duplicates_of(&wallet.name())?;
        self.ensure_no_impersonator_collision(&wallet, None).await?;

        self.wallets.push(wallet);

        self.on_wallet_changed().await?;
        self.save()?;

        ethui_broadcast::wallet_created().await;

        for (_, a) in addresses {
            ethui_broadcast::address_added(a).await;
        }

        Ok(())
    }

    async fn update(&mut self, name: String, params: Json) -> color_eyre::Result<()> {
        let i = self
            .wallets
            .iter()
            .position(|w| w.name() == name)
            .with_context(|| format!("invalid wallet name `{name}`"))?;

        let before = self.wallets[i].get_all_addresses().await;
        let updated = self.wallets[i].clone().update(params).await?;
        self.ensure_no_impersonator_collision(&updated, Some(&name))
            .await?;
        self.wallets[i] = updated;
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

    async fn remove(&mut self, name: String) -> color_eyre::Result<()> {
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

    /// Get all addresses currently enabled in a given wallet
    async fn get_wallet_addresses(&self, name: String) -> Vec<(String, Address)> {
        let wallet = self.find_wallet(&name).unwrap();

        wallet.get_all_addresses().await
    }

    /// Finds a wallet by its name
    fn find_wallet(&self, id: &String) -> Option<&Wallet> {
        self.wallets.iter().find(|w| w.name() == *id)
    }

    /// Persists current state to disk
    fn save(&self) -> color_eyre::Result<()> {
        let pathbuf = self.file.clone().unwrap();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }

    /// Ensures that self.current never points to an invalid wallet
    fn ensure_current(&mut self) {
        if self.wallets.is_empty() {
            self.wallets
                .push(Wallet::Plaintext(wallets::PlaintextWallet::default()));
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

        let addr = self.get_current_address().await;
        ethui_broadcast::current_address_changed(addr).await;
    }

    async fn on_wallet_changed(&self) -> color_eyre::Result<()> {
        let addr = self.get_current_address().await;

        self.notify_peers().await;
        ethui_broadcast::ui_notify(UINotify::WalletsChanged).await;
        ethui_broadcast::current_address_changed(addr).await;

        Ok(())
    }

    // broadcasts `accountsChanged` to all peers
    async fn notify_peers(&self) {
        let addresses = vec![self.get_current_wallet().get_current_address().await];
        ethui_broadcast::accounts_changed(addresses).await;
    }

    fn ensure_no_duplicates_of(&self, name: &str) -> color_eyre::Result<()> {
        if self.wallets.iter().any(|w| w.name() == name) {
            return Err(eyre!("duplicate wallet names `{}`", name));
        }
        Ok(())
    }

    /// Rejects `wallet` if it shares an address with an existing wallet of the
    /// opposite signing kind (real-key vs. `Impersonator`) — otherwise an
    /// impersonator could silently take over signing for a real wallet's
    /// address just by becoming current. Same-kind collisions (e.g. one
    /// mnemonic imported twice) are fine and stay allowed.
    async fn ensure_no_impersonator_collision(
        &self,
        wallet: &Wallet,
        exclude_name: Option<&str>,
    ) -> color_eyre::Result<()> {
        let is_impersonator = matches!(wallet, Wallet::Impersonator(_));
        let addresses: HashSet<Address> = wallet
            .get_all_addresses()
            .await
            .into_iter()
            .map(|(_, address)| address)
            .collect();

        for other in self.wallets.iter() {
            if exclude_name == Some(other.name().as_str()) {
                continue;
            }

            if matches!(other, Wallet::Impersonator(_)) == is_impersonator {
                continue;
            }

            for (_, address) in other.get_all_addresses().await {
                if addresses.contains(&address) {
                    return Err(eyre!(
                        "address {address} is already held by `{}` ({}) — an impersonator \
                         cannot share an address with a real-key wallet",
                        other.name(),
                        other.wallet_type()
                    ));
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr as _;

    use super::*;
    use crate::wallets::{Impersonator, PlaintextWallet};

    /// The first address of the anvil mnemonic, which the default plaintext
    /// wallet derives.
    const ANVIL_0: &str = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

    fn wallets_with(entries: Vec<Wallet>) -> Wallets {
        Wallets {
            wallets: entries,
            current: 0,
            file: None,
        }
    }

    #[tokio::test]
    async fn same_kind_collisions_are_allowed() {
        let addr = Address::from_str(ANVIL_0).unwrap();
        let wallets = wallets_with(vec![Wallet::Impersonator(Impersonator {
            name: "impersonator".into(),
            addresses: vec![addr],
            current: 0,
        })]);
        let second = Wallet::Impersonator(Impersonator {
            name: "second-impersonator".into(),
            addresses: vec![addr],
            current: 0,
        });

        assert!(
            wallets
                .ensure_no_impersonator_collision(&second, None)
                .await
                .is_ok()
        );
    }

    #[tokio::test]
    async fn an_impersonator_cannot_shadow_a_real_key_wallets_address() {
        let addr = Address::from_str(ANVIL_0).unwrap();
        let wallets = wallets_with(vec![Wallet::Plaintext(PlaintextWallet::default())]);
        let shadow = Wallet::Impersonator(Impersonator {
            name: "shadow".into(),
            addresses: vec![addr],
            current: 0,
        });

        let err = wallets
            .ensure_no_impersonator_collision(&shadow, None)
            .await
            .unwrap_err();

        assert!(err.to_string().contains("Plaintext"), "got: {err}");
    }

    #[tokio::test]
    async fn a_real_key_wallet_cannot_collide_with_an_existing_impersonator() {
        let addr = Address::from_str(ANVIL_0).unwrap();
        let wallets = wallets_with(vec![Wallet::Impersonator(Impersonator {
            name: "impersonator".into(),
            addresses: vec![addr],
            current: 0,
        })]);
        let real_key = Wallet::Plaintext(PlaintextWallet::default());

        let err = wallets
            .ensure_no_impersonator_collision(&real_key, None)
            .await
            .unwrap_err();

        assert!(err.to_string().contains("impersonator"), "got: {err}");
    }

    #[tokio::test]
    async fn updating_a_wallet_excludes_its_own_prior_entry() {
        let addr = Address::from_str(ANVIL_0).unwrap();
        let wallets = wallets_with(vec![Wallet::Impersonator(Impersonator {
            name: "impersonator".into(),
            addresses: vec![addr],
            current: 0,
        })]);
        let unchanged = Wallet::Impersonator(Impersonator {
            name: "impersonator".into(),
            addresses: vec![addr],
            current: 0,
        });

        assert!(
            wallets
                .ensure_no_impersonator_collision(&unchanged, Some("impersonator"))
                .await
                .is_ok()
        );
    }
}
