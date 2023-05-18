#![allow(dead_code)]

use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use ethers::types::Address;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
/// An audit of 3 different async RwLock implementations:
/// https://www.reddit.com/r/rust/comments/f4zldz/i_audited_3_different_implementation_of_async/
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::context::{wallet::ChecksummedAddress, Wallet};

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct Wallets {
    current: Option<Current>,
    wallets: Vec<Wallet>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Current {
    name: String,
    key: String,
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

    async fn read<'a>() -> RwLockReadGuard<'a, Wallets> {
        WALLETS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Wallets> {
        WALLETS.get().unwrap().write().await
    }

    fn get_all(&self) -> Vec<Wallet> {
        self.wallets.clone()
    }

    fn set_wallets(&mut self, wallets: Vec<Wallet>) -> Result<(), String> {
        self.wallets = wallets;
        self.ensure_current();

        Ok(())
    }

    fn derive_addresses(&self, name: Option<String>) -> HashMap<String, ChecksummedAddress> {
        let name = name.unwrap_or_else(|| self.current.as_ref().unwrap().name.clone());
        let wallet = self.find_wallet(&name).unwrap();

        wallet.derive_all_addresses().unwrap()
    }

    fn get_current(&self) -> Option<&Wallet> {
        if let Some(current) = &self.current {
            self.find_wallet(&current.name)
        } else {
            None
        }
    }

    fn find_wallet(&self, id: &String) -> Option<&Wallet> {
        self.wallets.iter().find(|w| &w.name == id)
    }

    fn ensure_current(&mut self) {
        if self.wallets.is_empty() {
            self.wallets.push(Default::default());
        }

        if self.get_current().is_none() {
            self.current = Some(Current {
                name: self.wallets[0].name.clone(),
                key: self.wallets[0].default_key(),
            });
        }
    }

    fn save(&mut self) -> crate::Result<()> {
        let path = Path::new(FILE.get().unwrap());
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }
}

#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    Wallets::read().await.get_all()
}

#[tauri::command]
pub async fn wallets_get_current() -> Result<Wallet, String> {
    Ok(Wallets::read().await.get_current().cloned().unwrap())
}

#[tauri::command]
pub async fn wallets_set(list: Vec<Wallet>) -> Result<(), String> {
    Wallets::write().await.set_wallets(list)
}

#[tauri::command]
pub async fn wallets_get_addresses(
    name: Option<String>,
) -> Result<HashMap<String, ChecksummedAddress>, String> {
    Ok(Wallets::read().await.derive_addresses(name))
}
