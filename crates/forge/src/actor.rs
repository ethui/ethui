use std::{
    collections::{BTreeMap, HashSet},
    path::{Path, PathBuf},
    time::Duration,
};

use alloy::primitives::Bytes;
use ethui_types::UINotify;
use futures::{stream, StreamExt as _};
use glob::glob;
use kameo::{actor::ActorRef, message::Message, Actor};
use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    new_debouncer, DebounceEventResult, DebouncedEvent, Debouncer, RecommendedCache,
};
use tracing::{instrument, trace, warn};

use crate::{abi::ForgeAbi, utils};

#[derive(Default)]
pub struct Worker {
    roots: HashSet<PathBuf>,
    foundry_roots: HashSet<PathBuf>,
    watcher: Option<Debouncer<RecommendedWatcher, RecommendedCache>>,

    abis_by_path: BTreeMap<PathBuf, ForgeAbi>,
    self_ref: Option<ActorRef<Worker>>,
    has_new_abis: bool,

    update_contracts_triggers: usize,
}

pub enum Msg {
    UpdateRoots(Vec<PathBuf>),
    PollFoundryRoots,
    NewContract,
}

impl Message<Msg> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::UpdateRoots(roots) => {
                let _ = self.update_roots(roots).await;
            }

            Msg::PollFoundryRoots => {
                let _ = self.update_foundry_roots().await;
            }

            Msg::NewContract => {
                self.trigger_update_contracts().await;
            }
        }
    }
}

impl Message<Vec<DebouncedEvent>> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        events: Vec<DebouncedEvent>,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        trace!("process_debounced_events");
        for debounced in events.into_iter() {
            let path = debounced.event.paths[0].clone();
            match debounced.event.try_into() {
                Ok(abi) => self.insert_abi(abi),
                Err(_) => self.remove_abi(&path),
            }
        }

        self.trigger_update_contracts().await;
    }
}

struct UpdateContracts;

impl Message<UpdateContracts> for Worker {
    type Reply = color_eyre::Result<()>;

    async fn handle(
        &mut self,
        _msg: UpdateContracts,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.update_contracts_triggers -= 1;

        // if the counter hasn't reached zero, it means more updates are queued, so we skip this
        // one (poor-man's debounce)
        if self.update_contracts_triggers > 0 {
            return Ok(());
        }

        let db = ethui_db::get();
        let contracts = db.get_incomplete_contracts().await?;

        let mut any_updates = false;

        let s = &self;

        let contracts_with_code = stream::iter(contracts)
            .map(|((chain_id, dedup_id), address, code)| async move {
                let code: Option<Bytes> = match code {
                    Some(code) if !code.is_empty() => Some(code),
                    _ => utils::get_code(chain_id, address).await.ok(),
                };

                code.map(|c| ((chain_id, dedup_id), address, c))
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

        for ((chain_id, dedup_id), address, code, abi) in contracts_with_code.into_iter() {
            trace!(chain_id=chain_id, dedup_id=dedup_id, address=?address, abi=abi.name);
            db.insert_contract_with_abi(
                (chain_id, dedup_id).into(),
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
}

pub struct FetchAbis;

impl Message<FetchAbis> for Worker {
    type Reply = Vec<ForgeAbi>;

    async fn handle(
        &mut self,
        _msg: FetchAbis,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.abis_by_path.clone().into_values().collect()
    }
}

impl Actor for Worker {
    type Error = color_eyre::Report;

    async fn on_start(
        &mut self,
        actor_ref: kameo::actor::ActorRef<Self>,
    ) -> std::result::Result<(), Self::Error> {
        self.self_ref = Some(actor_ref.clone());

        let debounced_watcher = new_debouncer(
            Duration::from_millis(500),
            None,
            move |result: DebounceEventResult| match result {
                Ok(events) => {
                    actor_ref.tell(events);
                }
                Err(e) => tracing::warn!("watch error: {:?}", e),
            },
        )?;

        self.watcher = Some(debounced_watcher);

        Ok(())
    }
}

impl Worker {
    #[instrument(skip_all)]
    async fn scan_project(&mut self, root: &Path) -> color_eyre::Result<()> {
        let pattern = root.join("out").join("**").join("*.json");
        for path in glob(pattern.to_str().unwrap())?.filter_map(|p| p.ok()) {
            if let Ok(abi) = path.clone().try_into() {
                self.insert_abi(abi);
            }
        }

        self.trigger_update_contracts().await;

        Ok(())
    }

    #[instrument(skip_all)]
    async fn update_roots(&mut self, roots: Vec<PathBuf>) -> color_eyre::Result<()> {
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

        self.self_ref
            .as_ref()
            .unwrap()
            .tell(Msg::PollFoundryRoots)
            .try_send()?;

        Ok(())
    }

    async fn trigger_update_contracts(&mut self) {
        self.update_contracts_triggers += 1;
        if let Some(r) = &self.self_ref {
            let _ = r.tell(UpdateContracts).try_send();
        }
    }

    #[instrument(skip_all)]
    async fn update_foundry_roots(&mut self) -> color_eyre::Result<()> {
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

        match self.watcher.as_mut() {
            Some(watcher) => {
                for path in to_remove {
                    watcher.unwatch(path.join("out"))?;
                }
                for path in to_add {
                    watcher.watch(path.join("out"), RecursiveMode::Recursive)?;
                }
            }

            None => {
                warn!("forge watcher not initialized");
            }
        }

        Ok(())
    }

    #[instrument(skip_all)]
    async fn add_path(&mut self, path: PathBuf) -> color_eyre::Result<()> {
        trace!(path= ?path);
        if self.roots.contains(&path) {
            return Ok(());
        }

        self.roots.insert(path.clone());
        self.update_foundry_roots().await?;
        Ok(())
    }

    #[instrument(skip_all)]
    async fn remove_path(&mut self, path: PathBuf) -> color_eyre::Result<()> {
        trace!(path = ?path);
        if self.roots.remove(&path) {
            self.update_foundry_roots().await?;
        }
        Ok(())
    }

    /// Finds all project roots for Foundry projects (by locating foundry.toml files)
    /// If nested foundry.toml files are found, such as in dependencies or lib folders, they will be ignored.
    #[instrument(skip_all)]
    async fn find_foundry_roots(&self) -> color_eyre::Result<HashSet<PathBuf>> {
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

        let res = res.collect();
        trace!(foundry_roots = ?res);
        Ok(res)
    }

    fn insert_abi(&mut self, abi: ForgeAbi) {
        self.abis_by_path.insert(abi.path.clone(), abi);
        self.has_new_abis = true;
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
    use std::fs;

    use tempfile::TempDir;

    use super::*;

    #[tokio::test]
    pub async fn find_forge_tomls() -> color_eyre::Result<()> {
        let dir = create_fixture_directories()?;

        let mut actor = Worker::default();
        actor.add_path(dir.path().to_path_buf()).await?;

        let paths = actor.find_foundry_roots().await?;

        assert_eq!(paths.len(), 3);
        paths
            .into_iter()
            .for_each(|path| assert!(!path.display().to_string().contains("forge-std")));

        Ok(())
    }

    fn create_fixture_directories() -> color_eyre::Result<TempDir> {
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
