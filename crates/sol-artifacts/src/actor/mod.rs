mod ext;

use std::{
    collections::{BTreeMap, HashSet},
    ops::ControlFlow,
    path::{Path, PathBuf},
    time::Duration,
};

use ethui_settings::{OnboardingStep, SettingsActorExt as _, settings};
use ethui_types::prelude::*;
pub use ext::SolArtifactsActorExt;
use futures::{StreamExt as _, stream};
use glob::glob;
use kameo::prelude::*;
use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    DebounceEventResult, DebouncedEvent, Debouncer, RecommendedCache, new_debouncer,
};
use tokio::task;
use walkdir::{DirEntry, WalkDir};

/// Config files that indicate a project root (Foundry or Hardhat)
const PROJECT_CONFIG_FILES: &[&str] = &[
    "foundry.toml",
    "hardhat.config.ts",
    "hardhat.config.js",
    "hardhat.config.cjs",
];

/// Directories to skip when searching for project roots
const BLACKLISTED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "build",
    "dist",
    "coverage",
    "__pycache__",
    "venv",
    "cache",
    "tmp",
    "out",
    "artifacts",
    "dependencies",
];

use crate::{abi::SolArtifact, utils};

pub fn sol_artifacts() -> ActorRef<SolArtifactsActor> {
    try_sol_artifacts().expect("sol_artifacts actor not initialized")
}

pub fn try_sol_artifacts() -> color_eyre::Result<ActorRef<SolArtifactsActor>> {
    ActorRef::<SolArtifactsActor>::lookup("sol_artifacts")?
        .ok_or_else(|| color_eyre::eyre::eyre!("sol_artifacts actor not found"))
}

#[derive(Default)]
pub struct SolArtifactsActor {
    roots: HashSet<PathBuf>,
    project_roots: HashSet<PathBuf>,
    watcher: Option<Debouncer<RecommendedWatcher, RecommendedCache>>,

    abis_by_path: BTreeMap<PathBuf, SolArtifact>,
    self_ref: Option<ActorRef<SolArtifactsActor>>,

    update_contracts_triggers: usize,
}

impl Actor for SolArtifactsActor {
    type Args = ();
    type Error = color_eyre::Report;

    async fn on_start(_args: Self::Args, actor_ref: ActorRef<Self>) -> color_eyre::Result<Self> {
        let mut this = Self {
            self_ref: Some(actor_ref.clone()),
            ..Default::default()
        };

        let debounced_watcher = new_debouncer(
            Duration::from_millis(500),
            None,
            move |result: DebounceEventResult| match result {
                Ok(events) => {
                    let _ = actor_ref.tell(ProcessDebouncedEvents { events });
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
    ) -> color_eyre::Result<ControlFlow<ActorStopReason>> {
        error!("sol_artifacts actor panic: {}", err);
        Ok(ControlFlow::Continue(()))
    }
}

#[messages]
impl SolArtifactsActor {
    #[message]
    #[instrument(skip_all, level = "trace")]
    async fn update_roots(&mut self, roots: Vec<PathBuf>) {
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
            let _ = self.remove_path(path).await;
        }

        for path in to_add {
            let _ = self.add_path(path).await;
        }

        let _ = self
            .self_ref
            .as_ref()
            .unwrap()
            .tell(PollProjectRoots)
            .try_send();
    }

    #[message]
    async fn poll_project_roots(&mut self) {
        let _ = self.update_project_roots().await;
    }

    #[message]
    async fn new_contract(&mut self) {
        self.trigger_update_contracts().await;
    }

    #[message]
    async fn process_debounced_events(&mut self, events: Vec<DebouncedEvent>) {
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

    #[message]
    async fn update_contracts(&mut self) -> color_eyre::Result<()> {
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
                s.abis_by_path
                    .values()
                    .find(|abi| utils::diff_score(&abi.code, &code) < utils::FUZZ_DIFF_THRESHOLD)
                    .cloned()
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

    #[message]
    fn fetch_abis(&self) -> Vec<SolArtifact> {
        self.abis_by_path.clone().into_values().collect()
    }

    #[message]
    fn get_abi_for(&self, bytes: Bytes) -> Option<SolArtifact> {
        self.abis_by_path
            .values()
            .find(|abi| utils::diff_score(&abi.code, &bytes) < utils::FUZZ_DIFF_THRESHOLD)
            .cloned()
    }

    #[instrument(skip_all, fields(project = ?root), level = "trace")]
    async fn scan_project(&mut self, root: &Path) -> Result<()> {
        // TODO: read custom out dir from foundry.toml
        let out_dir = root.join("out");
        let artifacts_dir = root.join("artifacts/contracts");

        let out_dir = if out_dir.exists() {
            out_dir
        } else if artifacts_dir.exists() {
            artifacts_dir
        } else {
            return Ok(());
        };

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

        let settings_actor = settings();
        let settings = settings_actor.get_all().await?;

        if !self.abis_by_path.is_empty()
            && !settings
                .onboarding
                .is_step_finished(OnboardingStep::Foundry)
        {
            let _ = settings_actor
                .finish_onboarding_step(OnboardingStep::Foundry)
                .await;
        }

        self.trigger_update_contracts().await;

        Ok(())
    }

    async fn trigger_update_contracts(&mut self) {
        self.update_contracts_triggers += 1;
        if let Some(r) = &self.self_ref {
            let _ = r.tell(UpdateContracts).try_send();
        }
    }

    async fn update_project_roots(&mut self) -> Result<()> {
        let new_roots = self.find_project_roots().await?;
        trace!(roots = ?new_roots);

        let to_remove: Vec<_> = self
            .project_roots
            .iter()
            .filter(|p| !new_roots.contains(*p))
            .cloned()
            .collect();

        let to_add: Vec<_> = new_roots
            .iter()
            .filter(|p| !self.project_roots.contains(*p))
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
        self.update_project_roots().await?;
        Ok(())
    }

    #[instrument(skip_all, level = "trace")]
    async fn remove_path(&mut self, path: PathBuf) -> Result<()> {
        trace!(path = ?path);
        if self.roots.remove(&path) {
            self.update_project_roots().await?;
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

    /// Finds all project roots for Foundry/Hardhat projects (by locating project config files)
    /// Uses depth-first search to stop searching deeper once config file is found.
    /// Includes directory blacklist to avoid searching in node_modules, hidden directories, etc.
    #[instrument(skip_all, level = "trace")]
    async fn find_project_roots(&self) -> Result<HashSet<PathBuf>> {
        let roots = self.roots.clone();

        // Process all roots in parallel using spawn_blocking
        let all_matches: Vec<HashSet<PathBuf>> = stream::iter(roots)
            .map(|root| {
                task::spawn_blocking(move || {
                    let mut found = HashSet::new();

                    let walker = WalkDir::new(&root)
                        .into_iter()
                        .filter_entry(|e| {
                            !Self::is_hidden(e)
                                && e.file_name()
                                    .to_str()
                                    .map(|name| !BLACKLISTED_DIRS.contains(&name))
                                    .unwrap_or(true)
                        })
                        .filter_map(|e| e.ok())
                        .filter(|e| e.file_type().is_dir());

                    for entry in walker {
                        let dir = entry.path();

                        let has_config = PROJECT_CONFIG_FILES.iter().any(|f| dir.join(f).exists());

                        if has_config {
                            let dir = dir.to_path_buf();
                            let is_nested = found.iter().any(|p| dir.starts_with(p));
                            if !is_nested {
                                found.insert(dir);
                            }
                        }
                    }

                    found
                })
            })
            .buffer_unordered(5)
            .filter_map(|r| async { r.ok() })
            .collect()
            .await;

        // Merge results from all roots, filtering nested dirs across roots
        let mut all_dirs: Vec<_> = all_matches.into_iter().flatten().collect();
        all_dirs.sort();

        Ok(all_dirs.into_iter().fold(HashSet::new(), |mut acc, dir| {
            if !acc.iter().any(|p| dir.starts_with(p)) {
                acc.insert(dir);
            }
            acc
        }))
    }

    #[instrument(level = "trace", skip_all, fields(project = abi.project, name = abi.name))]
    fn insert_abi(&mut self, abi: SolArtifact) {
        self.abis_by_path.insert(abi.path.clone(), abi);
    }

    /// removes a previously known ABI by their path
    fn remove_abi(&mut self, path: &PathBuf) {
        self.abis_by_path.remove(path);
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::*;

    #[tokio::test]
    async fn find_project_roots() -> Result<()> {
        let dir = create_fixture_directories()?;

        let mut actor = SolArtifactsActor::default();
        actor.add_path(dir.path().to_path_buf()).await?;

        let paths = actor.find_project_roots().await?;

        assert_eq!(paths.len(), 5);

        // Verify nested dependencies are excluded
        for path in &paths {
            let path_str = path.display().to_string();
            assert!(!path_str.contains("forge-std"), "should exclude forge-std");
            assert!(
                !path_str.contains("node_modules"),
                "should exclude node_modules"
            );
        }

        Ok(())
    }

    fn create_fixture_directories() -> Result<TempDir> {
        let tempdir = TempDir::new().unwrap();
        let base_path = tempdir.path();

        // Foundry projects
        let foundry1 = base_path.join("subdir1/foundry-project1");
        let foundry2 = base_path.join("subdir1/foundry-project2");
        let foundry3 = base_path.join("subdir2/foundry-project3");

        // Hardhat projects
        let hardhat_ts = base_path.join("subdir2/hardhat-ts-project");
        let hardhat_js = base_path.join("subdir3/hardhat-js-project");

        // Not a project
        let not_project = base_path.join("subdir2/not-project");

        fs::create_dir_all(&foundry1)?;
        fs::create_dir_all(&foundry2)?;
        fs::create_dir_all(&foundry3)?;
        fs::create_dir_all(&hardhat_ts)?;
        fs::create_dir_all(&hardhat_js)?;
        fs::create_dir_all(&not_project)?;

        // Create config files
        fs::write(foundry1.join("foundry.toml"), "")?;
        fs::write(foundry2.join("foundry.toml"), "")?;
        fs::write(foundry3.join("foundry.toml"), "")?;
        fs::write(hardhat_ts.join("hardhat.config.ts"), "")?;
        fs::write(hardhat_js.join("hardhat.config.js"), "")?;

        // Nested foundry dependency (should be excluded via dependencies blacklist)
        fs::create_dir_all(foundry1.join("dependencies/forge-std"))?;
        fs::write(foundry1.join("dependencies/forge-std/foundry.toml"), "")?;

        // Nested hardhat in node_modules (should be excluded via node_modules blacklist)
        fs::create_dir_all(hardhat_ts.join("node_modules/some-package"))?;
        fs::write(
            hardhat_ts.join("node_modules/some-package/hardhat.config.ts"),
            "",
        )?;

        Ok(tempdir)
    }
}
