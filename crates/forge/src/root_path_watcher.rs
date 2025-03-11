#![allow(dead_code)]

use futures::channel::oneshot;
use tokio::task::JoinHandle;

use crate::{error::Result, Error};
use std::{collections::HashMap, path::PathBuf};

#[derive(Default)]
pub(crate) struct MultiPathWatcher {
    watchers: HashMap<PathBuf, RootPathWatcherHandle>,
}
pub struct RootPathWatcher {
    root: PathBuf,
    shutdown: oneshot::Receiver<()>,
}

impl RootPathWatcher {
    fn new(root: PathBuf, shutdown: oneshot::Receiver<()>) -> Result<Self> {
        Ok(Self { root, shutdown })
    }

    pub fn spawn(path: PathBuf) -> Result<RootPathWatcherHandle> {
        let (snd, rcv) = oneshot::channel();
        let watcher = Self::new(path, rcv)?;

        let join_handle = tokio::spawn(async move { watcher.run().await.unwrap() });
        Ok(RootPathWatcherHandle {
            join_handle,
            shutdown: snd,
        })
    }

    async fn run(mut self) -> Result<()> {
        loop {
            // TODO: do some actual work here
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            if self.shutdown.try_recv().is_ok() {
                break;
            }
        }
        Ok(())
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
