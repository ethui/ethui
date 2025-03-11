#![allow(dead_code)]

use futures::channel::oneshot;
use glob::glob;
use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use tokio::{
    sync::{mpsc, Mutex},
    task::JoinHandle,
    time::sleep,
};

use crate::{error::Result, worker::Worker, Error};
use std::{collections::HashSet, path::PathBuf, sync::Arc, time::Duration};

pub enum Msg {
    UpdateRoots(Vec<PathBuf>),
    PollFoundryRoots,
}

pub struct Handle {
    join_handle: JoinHandle<Result<()>>,
    snd: mpsc::Sender<Msg>,
}

impl Handle {
    pub async fn update_roots(&self, roots: Vec<PathBuf>) -> Result<()> {
        self.snd.send(Msg::UpdateRoots(roots)).await?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct Watcher {
    snd: mpsc::Sender<Msg>,
    rcv: mpsc::Receiver<Msg>,
    roots: HashSet<PathBuf>,
    foundry_roots: HashSet<PathBuf>,
    watcher: Arc<Mutex<Debouncer<RecommendedWatcher, RecommendedCache>>>,
    worker: JoinHandle<()>,
}

impl Watcher {
    pub(crate) fn spawn() -> Result<Handle> {
        let (snd, rcv) = mpsc::channel(100);
        let watcher = Self::new(snd.clone(), rcv)?;
        let join_handle = tokio::spawn(async move { watcher.run().await });

        Ok(Handle { join_handle, snd })
    }

    fn new(snd: mpsc::Sender<Msg>, rcv: mpsc::Receiver<Msg>) -> Result<Self> {
        let (worker_snd, worker_rcv) = mpsc::unbounded_channel();
        let debounced_watcher = new_debouncer(
            Duration::from_millis(200),
            None,
            move |result: DebounceEventResult| match result {
                Ok(events) => worker_snd.send(events).unwrap(),
                Err(e) => tracing::warn!("watch error: {:?}", e),
            },
        )?;

        let worker = tokio::spawn(async move { Worker::new(worker_rcv).run().await });

        Ok(Self {
            snd,
            rcv,
            roots: Default::default(),
            watcher: Arc::new(Mutex::new(debounced_watcher)),
            foundry_roots: Default::default(),
            worker,
        })
    }

    async fn run(mut self) -> Result<()> {
        // Kick off the initial scan
        self.snd.send(Msg::PollFoundryRoots).await?;

        loop {
            if let Some(msg) = self.rcv.recv().await {
                match msg {
                    Msg::UpdateRoots(roots) => {
                        self.update_roots(roots).await?;
                    }

                    Msg::PollFoundryRoots => {
                        let _ = self.update_foundry_roots().await;

                        // trigger a new in 60 seconds
                        let snd = self.snd.clone();
                        tokio::spawn(async move {
                            sleep(Duration::from_secs(60)).await;
                            snd.send(Msg::PollFoundryRoots).await.unwrap();
                        });
                    }
                }
            }
        }
    }

    pub async fn update_roots(&mut self, roots: Vec<PathBuf>) -> Result<()> {
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
}

pub(crate) struct RootPathWatcherHandle {
    pub join_handle: JoinHandle<()>,
    pub shutdown: oneshot::Sender<()>,
}

impl RootPathWatcherHandle {
    pub async fn shutdown(self) -> Result<()> {
        self.shutdown
            .send(())
            .map_err(|_| Error::FailedToShutdown)?;
        self.join_handle
            .await
            .map_err(|_| Error::FailedToShutdown)?;

        Ok(())
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

        let (snd, rcv) = tokio::sync::mpsc::channel(10);
        let mut root_path_watcher = Watcher::new(snd, rcv)?;
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
