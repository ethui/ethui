#![allow(dead_code)]

use std::collections::HashMap;

use once_cell::sync::OnceCell;
/// An audit of 3 different async RwLock implementations:
/// https://www.reddit.com/r/rust/comments/f4zldz/i_audited_3_different_implementation_of_async/
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::context::Wallet;

#[derive(Debug)]
pub struct Wallets {
    map: HashMap<String, Wallet>,
    current: Current,
}

#[derive(Debug)]
struct Current {
    id: String,
    idx: u32,
}

static WALLETS: OnceCell<RwLock<Wallets>> = OnceCell::new();

impl Wallets {
    // TODO: read from a config file here?
    pub fn init(wallets: HashMap<String, Wallet>) {
        WALLETS
            .set(RwLock::new(Wallets {
                map: wallets,
                current: Current {
                    // TODO: this can't be hardcoded
                    id: "test".into(),
                    idx: 0,
                },
            }))
            .unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Wallets> {
        WALLETS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Wallets> {
        WALLETS.get().unwrap().write().await
    }

    fn get_all(&self) -> Vec<Wallet> {
        self.map.values().cloned().collect()
    }

    fn get_current(&self) -> Wallet {
        self.map.get(&self.current.id).unwrap().clone()
    }

    fn set_wallets(&mut self, wallets: Vec<Wallet>) -> Result<(), String> {
        let first = wallets.first().ok_or("no wallets provided")?.clone();

        self.map = wallets.into_iter().map(|w| (w.name.clone(), w)).collect();

        // if current wallet is gone, conenct to the first new one
        if self.map.get(&self.current.id).is_none() {
            self.current = Current {
                id: first.name,
                idx: first.idx,
            };
        }

        Ok(())
    }

    fn derive_addresses(&self, id: Option<String>, count: u32) -> Vec<String> {
        let id = id.unwrap_or(self.current.id.clone());
        let wallet = self.map.get(&id).unwrap();

        wallet.derive_addresses(count).unwrap()
    }
}

#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    Wallets::read().await.get_all()
}

#[tauri::command]
pub async fn wallets_get_current() -> Result<Wallet, String> {
    Ok(Wallets::read().await.get_current())
}

#[tauri::command]
pub async fn wallets_set(list: Vec<Wallet>) -> Result<(), String> {
    Wallets::write().await.set_wallets(list)
}

#[tauri::command]
pub async fn wallets_derive(id: Option<String>, count: u32) -> Result<Vec<String>, String> {
    Ok(Wallets::read().await.derive_addresses(id, count))
}
