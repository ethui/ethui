#![allow(dead_code)]

use crate::{
    error::Result,
    root_path_watcher::{RootPathWatcher, RootPathWatcherHandle},
};
use std::{collections::HashMap, path::PathBuf};

#[derive(Default)]
pub(crate) struct MultiPathWatcher {
    watchers: HashMap<PathBuf, RootPathWatcherHandle>,
}

impl MultiPathWatcher {
    /// Updates the list of paths to watch, stoppping and starting watchers as necessary
    pub async fn update_paths(&mut self, paths: Vec<PathBuf>) -> Result<()> {
        let to_remove: Vec<_> = self
            .watchers
            .keys()
            .filter(|p| !paths.contains(p))
            .cloned()
            .collect();

        let to_add: Vec<_> = paths
            .iter()
            .filter(|p| !self.watchers.contains_key(*p))
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

    /// Adds a single path from the watcher, removing any existing watcher process
    async fn add_path(&mut self, path: PathBuf) -> Result<()> {
        if self.watchers.contains_key(&path) {
            return Ok(());
        }

        let watcher_handle = RootPathWatcher::spawn(path.clone())?;

        self.watchers.insert(path, watcher_handle);

        Ok(())
    }

    /// Removes a single path from the watcher
    async fn remove_path(&mut self, path: PathBuf) -> Result<()> {
        if let Some(watcher_handle) = self.watchers.remove(&path) {
            watcher_handle.shutdown().await?;
        }

        Ok(())
    }
}
