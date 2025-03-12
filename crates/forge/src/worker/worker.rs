use alloy::primitives::Bytes;
use ethui_types::UINotify;
use futures::{stream, StreamExt as _};
use glob::glob;
use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    new_debouncer, DebounceEventResult, DebouncedEvent, Debouncer, RecommendedCache,
};
use tokio::{
    select,
    sync::{
        mpsc::{self, UnboundedReceiver},
        Mutex, Notify,
    },
    time::interval,
};
use tracing::trace;

use crate::{abi::ForgeAbi, error::Result, utils};
use std::{
    collections::{BTreeMap, HashSet},
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use super::handle::{Handle, Msg};

#[derive(Debug)]
pub struct Worker {
    msg_rcv: mpsc::Receiver<Msg>,
    roots: HashSet<PathBuf>,
    foundry_roots: HashSet<PathBuf>,
    watcher: Arc<Mutex<Debouncer<RecommendedWatcher, RecommendedCache>>>,
    notify_rcv: UnboundedReceiver<Vec<DebouncedEvent>>,

    abis_by_path: BTreeMap<PathBuf, ForgeAbi>,
    new_abis_notifier: Notify,
}

impl Worker {
    /// Spawns a new watcher task
    pub(crate) fn spawn() -> Result<Handle> {
        let (snd, rcv) = mpsc::channel(100);
        let watcher = Self::new(rcv)?;
        dbg!(&watcher);
        tokio::spawn(async move { watcher.run().await });

        Ok(Handle::new(snd))
    }

    fn new(msg_rcv: mpsc::Receiver<Msg>) -> Result<Self> {
        let (notify_snd, notify_rcv) = mpsc::unbounded_channel();
        let debounced_watcher = new_debouncer(
            Duration::from_millis(200),
            None,
            move |result: DebounceEventResult| match result {
                Ok(events) => notify_snd.send(events).unwrap(),
                Err(e) => tracing::warn!("watch error: {:?}", e),
            },
        )?;

        Ok(Self {
            msg_rcv,
            roots: Default::default(),
            watcher: Arc::new(Mutex::new(debounced_watcher)),
            foundry_roots: Default::default(),
            notify_rcv,
            abis_by_path: Default::default(),
            new_abis_notifier: Default::default(),
        })
    }

    async fn run(mut self) -> Result<()> {
        let mut pool_roots = interval(Duration::from_secs(60));

        loop {
            select! {
                _ = pool_roots.tick() => {
                    let _ =self.update_foundry_roots().await;
                }

                Some(msg) = self.msg_rcv.recv() => {
                    let _ = self.process_msg(msg).await;
                }

                Some(debounced_events) = self.notify_rcv.recv() => {
                    let _ = self.process_debounced_events(debounced_events).await;
                }

                _ = self.new_abis_notifier.notified() => {
                    let _ = self.update_incomplete_contracts().await;
                }
            }
        }
    }

    async fn scan_project(&mut self, root: &Path) -> Result<()> {
        let pattern = root.join("out").join("**").join("*.json");
        for path in glob(pattern.to_str().unwrap())?.filter_map(|p| p.ok()) {
            if let Ok(abi) = path.clone().try_into() {
                self.insert_abi(abi);
            }
        }
        Ok(())
    }

    async fn process_msg(&mut self, msg: Msg) -> Result<()> {
        match msg {
            Msg::UpdateRoots(roots) => {
                self.update_roots(roots).await?;
            }

            Msg::PollFoundryRoots => {
                let _ = self.update_foundry_roots().await;
            }

            Msg::NewContract => {
                self.new_abis_notifier.notify_one();
            }
        }

        Ok(())
    }

    async fn update_roots(&mut self, roots: Vec<PathBuf>) -> Result<()> {
        let to_remove: Vec<_> = self
            .roots
            .iter()
            .filter(|p| !roots.contains(p))
            .cloned()
            .collect();

        let to_add: Vec<_> = roots
            .iter()
            .filter(|p| !self.roots.contains(*p))
            .cloned()
            .collect();

        for path in to_remove {
            self.remove_path(path).await?;
        }

        for path in to_add {
            self.add_path(path).await?;
        }

        self.update_foundry_roots().await?;

        Ok(())
    }

    async fn update_foundry_roots(&mut self) -> Result<()> {
        let new_foundry_roots = self.find_foundry_roots().await?;

        let to_remove: Vec<_> = self
            .foundry_roots
            .iter()
            .filter(|p| !self.roots.contains(*p))
            .cloned()
            .collect();

        let to_add: Vec<_> = new_foundry_roots
            .iter()
            .filter(|p| !self.foundry_roots.contains(*p))
            .cloned()
            .collect();

        for path in to_add.iter() {
            self.scan_project(path).await?;
        }
        let mut watcher = self.watcher.lock().await;
        for path in to_remove {
            watcher.unwatch(path.join("out"))?;
        }
        for path in to_add {
            watcher.watch(path.join("out"), RecursiveMode::Recursive)?;
        }

        Ok(())
    }

    async fn add_path(&mut self, path: PathBuf) -> Result<()> {
        if self.roots.contains(&path) {
            return Ok(());
        }

        self.roots.insert(path.clone());
        self.update_foundry_roots().await?;
        Ok(())
    }

    async fn remove_path(&mut self, path: PathBuf) -> Result<()> {
        if self.roots.remove(&path) {
            self.update_foundry_roots().await?;
        }
        Ok(())
    }

    /// Finds all project roots for Foundry projects (by locating foundry.toml files)
    /// If nested foundry.toml files are found, such as in dependencies or lib folders, they will be ignored.
    async fn find_foundry_roots(&self) -> Result<HashSet<PathBuf>> {
        let res = self.roots.iter().flat_map(|root| {
            let pattern = root.join("**").join("foundry.toml");
            let matches: Vec<_> = match glob(pattern.to_str().unwrap()) {
                Ok(g) => g.filter_map(|p| p.ok()).collect(),
                Err(_) => vec![],
            };

            let mut dirs: Vec<PathBuf> = matches
                .into_iter()
                .map(|p| p.parent().unwrap().into())
                .collect();

            let mut res: HashSet<PathBuf> = Default::default();

            // remove results that are subdirectories of other results
            dirs.sort();
            for dir in dirs {
                if res.contains(&dir) || res.iter().any(|other| dir.starts_with(other)) {
                    continue;
                }
                res.insert(dir);
            }
            res.into_iter()
        });

        Ok(res.collect())
    }

    async fn process_debounced_events(
        &mut self,
        debounced_events: Vec<DebouncedEvent>,
    ) -> Result<()> {
        trace!("process_debounced_events");
        for debounced in debounced_events.into_iter() {
            let path = debounced.event.paths[0].clone();
            match debounced.event.try_into() {
                Ok(abi) => self.insert_abi(abi),
                Err(_) => self.remove_abi(&path),
            }
        }
        Ok(())
    }

    async fn update_incomplete_contracts(&mut self) -> Result<()> {
        trace!("update_incomplete_contracts");
        let db = ethui_db::get();
        let contracts = db.get_incomplete_contracts().await?;

        let mut any_updates = false;

        let s = &self;
        trace!("{}", contracts.len());
        let contracts_with_code = stream::iter(contracts)
            .map(|(chain_id, address, code)| async move {
                let code: Option<Bytes> = match code {
                    Some(code) if code.len() > 0 => Some(code),
                    _ => utils::get_code(chain_id, address).await.ok(),
                };

                code.map(|c| (chain_id, address, c))
            })
            .buffer_unordered(10)
            .filter_map(|x| async { x })
            .map(|(chain_id, address, code)| async move {
                s.get_abi_for(&code)
                    .map(|abi| (chain_id, address, code, abi))
            })
            .buffer_unordered(10)
            .filter_map(|x| async { x })
            .collect::<Vec<_>>()
            .await;

        trace!("{}", contracts_with_code.len());

        for (chain_id, address, code, abi) in contracts_with_code.into_iter() {
            trace!(
                "updating contract {chain_id} {address} with ABI: {}",
                abi.name
            );
            db.insert_contract_with_abi(
                chain_id,
                address,
                Some(&code),
                Some(serde_json::to_string(&abi.abi)?),
                Some(abi.name),
                None,
            )
            .await?;
            any_updates = true;
        }

        if any_updates {
            ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
        }

        Ok(())
    }

    fn insert_abi(&mut self, abi: ForgeAbi) {
        trace!("insert abi {:?}", abi.path);
        self.abis_by_path.insert(abi.path.clone(), abi);
        self.new_abis_notifier.notify_one();
    }

    /// removes a previously known ABI by their path
    fn remove_abi(&mut self, path: &PathBuf) {
        self.abis_by_path.remove(path);
    }

    fn get_abi_for(&self, code: &Bytes) -> Option<ForgeAbi> {
        self.abis_by_path
            .values()
            .find(|abi| utils::diff_score(&abi.code, code) < utils::FUZZ_DIFF_THRESHOLD)
            .cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    use anyhow::Result;
    use tempfile::TempDir;

    #[tokio::test]
    pub async fn find_forge_tomls() -> Result<()> {
        let dir = create_fixture_directories()?;

        let (_snd, rcv) = tokio::sync::mpsc::channel(10);
        let mut root_path_watcher = Worker::new(rcv)?;
        root_path_watcher.add_path(dir.path().to_path_buf()).await?;

        let paths = root_path_watcher.find_foundry_roots().await?;

        assert_eq!(paths.len(), 3);
        paths
            .into_iter()
            .for_each(|path| assert!(!path.display().to_string().contains("forge-std")));

        Ok(())
    }

    fn create_fixture_directories() -> Result<TempDir> {
        let tempdir = TempDir::new().unwrap();
        let base_path = tempdir.path();

        let p1 = base_path.join("subdir1/project1");
        let p2 = base_path.join("subdir1/project2");
        let p3 = base_path.join("subdir2/project3");
        let not_project = base_path.join("subdir2/not-project");

        fs::create_dir_all(&p1)?;
        fs::create_dir_all(&p2)?;
        fs::create_dir_all(&p3)?;
        fs::create_dir_all(not_project)?;

        fs::write(p1.join("foundry.toml"), "")?;
        fs::write(p2.join("foundry.toml"), "")?;
        fs::write(p3.join("foundry.toml"), "")?;

        fs::create_dir_all(base_path.join("subdir1/project1/dependencies/forge-std"))?;
        fs::write(
            base_path.join("subdir1/project1/dependencies/forge-std/foundry.toml"),
            "",
        )?;

        Ok(tempdir)
    }
}
