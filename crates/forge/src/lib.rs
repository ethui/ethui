#![allow(dead_code)]

mod abi;
pub mod commands;
pub mod error;
mod init;
mod watcher;

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::{collections::HashMap, path::PathBuf};

pub use error::{Error, Result};
pub use init::init;
use once_cell::sync::Lazy;
use tokio::{
    spawn,
    sync::{mpsc, RwLock},
};

use self::watcher::Match;

#[derive(Default)]
pub struct Foundry {
    abis_by_path: HashMap<PathBuf, u64>,
    abis_by_code_hash: HashMap<u64, abi::Abi>,
}

static FOUNDRY: Lazy<RwLock<Foundry>> = Lazy::new(Default::default);

impl Foundry {
    fn get_abi_for(&self, code_hash: u64) -> Option<abi::Abi> {
        self.abis_by_code_hash.get(&code_hash).cloned()
    }

    /// starts the ABI watcher service
    async fn watch(path: String) -> Result<()> {
        let (snd, rcv) = mpsc::unbounded_channel();
        let snd_clone = snd.clone();
        let path_clone = path.clone();

        // spawn file watcher
        spawn(async { watcher::async_watch(path, snd_clone).await.unwrap() });
        // spawn initial file globber
        spawn(async { watcher::scan_glob(path_clone, snd).await.unwrap() });
        // spawn event handler
        spawn(async { Self::handle_events(rcv).await.unwrap() });

        Ok(())
    }

    /// Handlers ABI file events
    async fn handle_events(mut rcv: mpsc::UnboundedReceiver<Match>) -> Result<()> {
        while let Some(m) = rcv.recv().await {
            let mut foundry = FOUNDRY.write().await;
            if let Ok(abi) = abi::Abi::try_from_match(m.clone()) {
                foundry.insert_known_abi(abi);
            } else {
                foundry.remove_known_abi(m.full_path);
            }
        }

        Ok(())
    }

    // indexes a new known ABI
    fn insert_known_abi(&mut self, abi: abi::Abi) {
        tracing::trace!("insert ABI: {:?}", abi.path);
        self.abis_by_path.insert(abi.path.clone(), abi.code_hash);
        self.abis_by_code_hash.insert(abi.code_hash, abi);
    }

    // removes a previously known ABI by their path
    fn remove_known_abi(&mut self, path: PathBuf) {
        if let Some(code_hash) = self.abis_by_path.remove(&path) {
            tracing::trace!("remove ABI: {:?}", path);
            self.abis_by_code_hash.remove(&code_hash);
        }
    }
}

pub fn calculate_code_hash<T: Hash>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}
