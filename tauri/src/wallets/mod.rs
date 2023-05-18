use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
/// An audit of 3 different async RwLock implementations:
/// https://www.reddit.com/r/rust/comments/f4zldz/i_audited_3_different_implementation_of_async/
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::context::{wallet::ChecksummedAddress, Wallet};

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct Wallets {
    wallets: Vec<Wallet>,
    #[serde(default)]
    current: usize,
}

static WALLETS: OnceCell<RwLock<Wallets>> = OnceCell::new();
static FILE: OnceCell<PathBuf> = OnceCell::new();

impl Wallets {
    pub fn init(file: PathBuf) {
        FILE.set(file.clone()).unwrap();
        let path = Path::new(&file);

        let mut res: Self = if path.exists() {
            let file = File::open(path).unwrap();
            let reader = BufReader::new(file);
            serde_json::from_reader(reader).unwrap()
        } else {
            Default::default()
        };

        res.ensure_current();
        WALLETS.set(RwLock::new(res)).unwrap();
    }

    pub async fn read<'a>() -> RwLockReadGuard<'a, Wallets> {
        WALLETS.get().unwrap().read().await
    }

    pub async fn write<'a>() -> RwLockWriteGuard<'a, Wallets> {
        WALLETS.get().unwrap().write().await
    }

    fn save(&self) -> crate::Result<()> {
        let path = Path::new(FILE.get().unwrap());
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }

    fn get_all(&self) -> Vec<Wallet> {
        self.wallets.clone()
    }

    fn set_wallets(&mut self, wallets: Vec<Wallet>) -> Result<(), String> {
        self.wallets = wallets;
        self.ensure_current();
        self.save()?;

        Ok(())
    }

    fn get_wallet_addresses(&self, name: String) -> Vec<(String, ChecksummedAddress)> {
        let wallet = self.find_wallet(&name).unwrap();

        wallet.derive_all_addresses().unwrap()
    }

    pub fn get_current(&self) -> &Wallet {
        &self.wallets[self.current]
    }

    fn find_wallet(&self, id: &String) -> Option<&Wallet> {
        self.wallets.iter().find(|w| &w.name == id)
    }

    fn set_current_wallet(&mut self, id: usize) -> Result<(), String> {
        if id >= self.wallets.len() {
            return Err(format!("Wallet with id {} not found", id));
        }
        self.current = id;
        self.save()?;
        Ok(())
    }

    fn set_current_key(&mut self, key: String) -> Result<(), String> {
        self.wallets[self.current].set_current_key(key);
        self.save()?;
        Ok(())
    }

    fn ensure_current(&mut self) {
        if self.wallets.is_empty() {
            self.wallets.push(Default::default());
        }

        if self.current >= self.wallets.len() {
            self.current = 0;
        }
    }
}

#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    Wallets::read().await.get_all()
}

#[tauri::command]
pub async fn wallets_get_current() -> Result<Wallet, String> {
    Ok(Wallets::read().await.get_current().clone())
}

#[tauri::command]
pub async fn wallets_get_current_address() -> Result<ChecksummedAddress, String> {
    Ok(Wallets::read().await.get_current().current_address())
}

#[tauri::command]
pub async fn wallets_set_list(list: Vec<Wallet>) -> Result<(), String> {
    Wallets::write().await.set_wallets(list)
}

#[tauri::command]
pub async fn wallets_set_current_wallet(idx: usize) -> Result<(), String> {
    Wallets::write().await.set_current_wallet(idx)
}

#[tauri::command]
pub async fn wallets_set_current_key(key: String) -> Result<(), String> {
    Wallets::write().await.set_current_key(key)
}

#[tauri::command]
pub async fn wallets_get_wallet_addresses(
    name: String,
) -> Result<Vec<(String, ChecksummedAddress)>, String> {
    Ok(Wallets::read().await.get_wallet_addresses(name))
}
