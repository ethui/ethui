#![allow(dead_code)]

use futures::channel::oneshot;
use glob::glob;
use notify::INotifyWatcher;
use tokio::task::JoinHandle;

use crate::{error::Result, Error};
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{mpsc, Arc, Mutex},
};

#[derive(Debug)]
pub struct RootPathsWatcher {
    roots: HashSet<PathBuf>,
    watcher: Arc<Mutex<INotifyWatcher>>,
    rcv: Arc<Mutex<mpsc::Receiver<notify::Result<notify::Event>>>>,
}

impl RootPathsWatcher {
    pub(crate) fn new() -> Result<Self> {
        let (snd, rcv) = mpsc::channel();
        let watcher = notify::recommended_watcher(snd)?;

        Ok(Self {
            roots: Default::default(),
            watcher: Arc::new(Mutex::new(watcher)),
            rcv: Arc::new(Mutex::new(rcv)),
        })
    }

    pub async fn update_paths(&mut self, paths: Vec<PathBuf>) -> Result<()> {
        let to_remove: Vec<_> = self
            .roots
            .iter()
            .filter(|p| !paths.contains(p))
            .cloned()
            .collect();

        let to_add: Vec<_> = paths
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

        Ok(())
    }

    pub async fn add_path(&mut self, path: PathBuf) -> Result<()> {
        if self.roots.contains(&path) {
            return Ok(());
        }

        // TODO:
        self.roots.insert(path);
        Ok(())
    }

    async fn remove_path(&mut self, path: PathBuf) -> Result<()> {
        if self.roots.remove(&path) {
            // TODO:
        }
        Ok(())
    }

    /// Finds all project roots for Foundry projects (by locating foundry.toml files)
    /// If nested foundry.toml files are found, such as in dependencies or lib folders, they will be ignored.
    async fn find_foundry_roots(&self) -> Result<Vec<PathBuf>> {
        let res = self.roots.iter().flat_map(|root| {
            let pattern = root.join("**").join("foundry.toml");
            dbg!(&pattern);
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
                if res.contains(&dir) || res.iter().any(|other| dir.starts_with(&other)) {
                    dbg!("skipping", &dir);
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

        let mut root_path_watcher = RootPathsWatcher::new()?;
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
