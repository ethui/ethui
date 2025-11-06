use std::{
    collections::{BTreeMap, HashSet},
    path::{Path, PathBuf},
    time::Duration,
};

use ethui_settings::{GetAll, OnboardingStep, Set};
use ethui_types::prelude::*;
use futures::{StreamExt as _, stream};
use glob::glob;
use kameo::prelude::*;
use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    DebounceEventResult, DebouncedEvent, Debouncer, RecommendedCache, new_debouncer,
};
use tokio::task;
use walkdir::{DirEntry, WalkDir};

use crate::{abi::ForgeAbi, utils};

pub async fn ask<M>(msg: M) -> color_eyre::Result<<<Worker as Message<M>>::Reply as Reply>::Ok>
where
    Worker: Message<M>,
    M: Send + 'static + Sync,
    <<Worker as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor =
        ActorRef::<Worker>::lookup("settings")?.wrap_err_with(|| "forge actor not found")?;

    // The function now directly uses the global actor reference.
    actor.ask(msg).await.wrap_err_with(|| "failed")
}

pub async fn tell<M>(msg: M) -> color_eyre::Result<()>
where
    Worker: Message<M>,
    M: Send + 'static + Sync,
    <<Worker as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor =
        ActorRef::<Worker>::lookup("settings")?.wrap_err_with(|| "forge actor not found")?;

    actor.tell(msg).await.map_err(Into::into)
}

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
    type Reply = Result<()>;

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

pub struct GetAbiFor(pub Bytes);

impl Message<GetAbiFor> for Worker {
    type Reply = Option<ForgeAbi>;

    async fn handle(
        &mut self,
        msg: GetAbiFor,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        self.get_abi_for(&msg.0)
    }
}

impl Actor for Worker {
    type Args = ();
    type Error = color_eyre::Report;

    async fn on_start(
        _args: Self::Args,
        actor_ref: kameo::actor::ActorRef<Self>,
    ) -> std::result::Result<Self, Self::Error> {
        let mut this = Self {
            self_ref: Some(actor_ref.clone()),
            ..Default::default()
        };

        let debounced_watcher = new_debouncer(
            Duration::from_millis(500),
            None,
            move |result: DebounceEventResult| match result {
                Ok(events) => {
                    let _ = actor_ref.tell(events);
                }
                Err(e) => tracing::warn!("watch error: {:?}", e),
            },
        )?;

        this.watcher = Some(debounced_watcher);

        Ok(this)
    }

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> std::result::Result<std::ops::ControlFlow<ActorStopReason>, Self::Error> {
        error!("ethui_forge panic: {}", err);
        Ok(std::ops::ControlFlow::Continue(()))
    }
}

impl Worker {
    #[instrument(skip_all, fields(project = ?root), level = "trace")]
    async fn scan_project(&mut self, root: &Path) -> Result<()> {
        // TODO: read custom out dir from foundry.toml
        let out_dir = root.join("out");

        if !out_dir.exists() {
            return Ok(());
        }

        let skip_patterns = ["build-info", "cache", "temp", "tmp"];

        // Use spawn_blocking for the synchronous glob operation to avoid blocking the async runtime
        let pattern = out_dir.join("*.sol").join("*.json");
        let pattern_str = pattern.to_string_lossy().to_string();
        let paths = task::spawn_blocking(move || -> Result<Vec<_>> {
            Ok(glob(&pattern_str)
                .map_err(|e| color_eyre::eyre::eyre!("Glob pattern error: {}", e))?
                .filter_map(|p| p.ok())
                .filter(|path| {
                    // Apply skip patterns to parent directory names
                    if let Some(parent) = path
                        .parent()
                        .and_then(|p| p.file_name())
                        .and_then(|n| n.to_str())
                    {
                        !skip_patterns.iter().any(|pattern| parent.contains(pattern))
                    } else {
                        true
                    }
                })
                .collect())
        })
        .await??;

        // Process files in parallel using buffered stream for controlled concurrency
        let valid_abis: Vec<_> = stream::iter(paths)
            .map(|path| async move {
                // Convert path to ABI in parallel
                match path.clone().try_into() {
                    Ok(abi) => Some(abi),
                    Err(e) => {
                        // probably not a valid ABI file
                        // if there's too much spam here, probably means we should narrow down our
                        // search pattern
                        tracing::debug!("Failed to parse ABI from {}: {:?}", path.display(), e);
                        None
                    }
                }
            })
            .buffer_unordered(10) // Process up to 10 files concurrently
            .filter_map(|abi| async move { abi })
            .collect()
            .await;

        // Insert all valid ABIs
        for abi in valid_abis {
            self.insert_abi(abi);
        }

        if !self.abis_by_path.is_empty() {
            if let Ok(settings) = ethui_settings::ask(GetAll).await {
                if !settings.onboarding.is_step_finished(OnboardingStep::Foundry) {
                    let _ = ethui_settings::tell(Set::FinishOnboardingStep(OnboardingStep::Foundry))
                        .await;
                }
            }
        }

        self.trigger_update_contracts().await;

        Ok(())
    }

    #[instrument(skip_all, level = "trace")]
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

    #[instrument(skip_all, level = "trace")]
    async fn add_path(&mut self, path: PathBuf) -> Result<()> {
        trace!(path= ?path);
        if self.roots.contains(&path) {
            return Ok(());
        }

        self.roots.insert(path.clone());
        self.update_foundry_roots().await?;
        Ok(())
    }

    #[instrument(skip_all, level = "trace")]
    async fn remove_path(&mut self, path: PathBuf) -> Result<()> {
        trace!(path = ?path);
        if self.roots.remove(&path) {
            self.update_foundry_roots().await?;
        }
        Ok(())
    }

    /// Helper function to check if a directory entry is hidden
    /// Allows root directory (depth 0) to pass through
    fn is_hidden(entry: &DirEntry) -> bool {
        entry
            .file_name()
            .to_str()
            .map(|s| entry.depth() > 0 && s.starts_with('.'))
            .unwrap_or(false)
    }

    /// Finds all project roots for Foundry projects (by locating foundry.toml files)
    /// Uses depth-first search to stop searching deeper once foundry.toml is found.
    /// Includes directory blacklist to avoid searching in node_modules, hidden directories, etc.
    #[instrument(skip_all, level = "trace")]
    async fn find_foundry_roots(&self) -> Result<HashSet<PathBuf>> {
        let roots = self.roots.clone();

        // Directory blacklist patterns to avoid (hidden directories handled by filter_entry)
        let blacklist = [
            "node_modules",
            "target",
            "build",
            "dist",
            "coverage",
            "__pycache__",
            "venv",
        ];

        // Process all roots in parallel using spawn_blocking
        let all_matches: Vec<_> = stream::iter(roots)
            .map(|root| {
                task::spawn_blocking(move || {
                    let mut foundry_dirs = Vec::new();
                    let mut visited_foundry_roots = HashSet::new();

                    let walker = WalkDir::new(&root)
                        .into_iter()
                        .filter_entry(|e| {
                            // Skip hidden directories and blacklisted directories
                            if Self::is_hidden(e) {
                                return false;
                            }
                            if let Some(name) = e.file_name().to_str() {
                                !blacklist.contains(&name)
                            } else {
                                true
                            }
                        })
                        .filter_map(|e| e.ok())
                        .filter(|e| e.file_type().is_dir());

                    for entry in walker {
                        let dir_path = entry.path();
                        let foundry_toml_path = dir_path.join("foundry.toml");

                        // Check if this directory contains a foundry.toml file
                        if foundry_toml_path.exists() {
                            let dir_path_buf = dir_path.to_path_buf();

                            // Only add if we haven't already found a foundry.toml in a parent directory
                            let is_nested = visited_foundry_roots
                                .iter()
                                .any(|existing: &PathBuf| dir_path_buf.starts_with(existing));

                            if !is_nested {
                                foundry_dirs.push(dir_path_buf.clone());
                                visited_foundry_roots.insert(dir_path_buf);
                            }
                        }
                    }

                    foundry_dirs
                })
            })
            .buffer_unordered(5) // Process up to 5 root directories concurrently
            .filter_map(|result| async move {
                match result {
                    Ok(matches) => Some(matches),
                    Err(e) => {
                        tracing::warn!("Task failed: {}", e);
                        None
                    }
                }
            })
            .collect()
            .await;

        // Flatten all matches and remove any remaining nested directories
        let all_dirs: Vec<PathBuf> = all_matches.into_iter().flatten().collect();
        let mut sorted_dirs = all_dirs;
        sorted_dirs.sort();

        let mut result: HashSet<PathBuf> = HashSet::new();
        for dir in sorted_dirs {
            // Skip if this directory is a subdirectory of an already included directory
            if !result.iter().any(|other| dir.starts_with(other)) {
                // Remove any directories that are subdirectories of this one
                result.retain(|other| !other.starts_with(&dir));
                result.insert(dir);
            }
        }

        Ok(result)
    }

    #[instrument(level = "trace", skip_all, fields(project = abi.project, name = abi.name))]
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
    async fn find_forge_tomls() -> Result<()> {
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
