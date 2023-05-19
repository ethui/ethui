mod abi;
pub mod commands;
mod watcher;

use std::{collections::HashMap, path::PathBuf, sync::RwLock};

use once_cell::sync::Lazy;
use tokio::{spawn, sync::mpsc};

use self::abi::calculate_codehash;

static PATH: &str = "/home/naps62/projects/";

#[derive(Default)]
pub struct Foundry {
    abis_by_path: HashMap<PathBuf, u64>,
    abis_by_codehash: HashMap<u64, abi::Abi>,
}

static FOUNDRY: Lazy<RwLock<Foundry>> = Lazy::new(Default::default);

impl Foundry {
    pub async fn init() -> crate::Result<()> {
        Self::watch().await
    }

    fn get_abi_for(&self, code: String) -> Option<abi::Abi> {
        let codehash = calculate_codehash(&code);
        self.abis_by_codehash.get(&codehash).cloned()
    }

    /// starts the ABI watcher service
    async fn watch() -> crate::Result<()> {
        let (snd, rcv) = mpsc::unbounded_channel();
        let snd_clone = snd.clone();

        // spawn file watcher
        spawn(async { watcher::async_watch(PATH, snd_clone).await.unwrap() });
        // spawn initial file globber
        spawn(async { watcher::scan_glob(PATH, snd).await.unwrap() });
        // spawn event handler
        spawn(async { Self::handle_events(rcv).await.unwrap() });

        Ok(())
    }

    /// Handlers ABI file events
    async fn handle_events(mut rcv: mpsc::UnboundedReceiver<PathBuf>) -> crate::Result<()> {
        while let Some(path) = rcv.recv().await {
            let mut foundry = FOUNDRY.write().unwrap();
            if let Ok(abi) = abi::Abi::try_from_file(path.clone()) {
                foundry.insert_known_abi(abi);
            } else {
                foundry.remove_known_abi(path);
            }
        }

        Ok(())
    }

    // indexes a new known ABI
    fn insert_known_abi(&mut self, abi: abi::Abi) {
        self.abis_by_path.insert(abi.path.clone(), abi.codehash);
        self.abis_by_codehash.insert(abi.codehash, abi);
    }

    // removes a previously known ABI by their path
    fn remove_known_abi(&mut self, path: PathBuf) {
        if let Some(code_hash) = self.abis_by_path.remove(&path) {
            self.abis_by_codehash.remove(&code_hash);
        }
    }
}
