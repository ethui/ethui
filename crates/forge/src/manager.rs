#![allow(dead_code)]

use std::{collections::BTreeMap, path::PathBuf};

use iron_types::Bytes;
use tokio::{spawn, sync::mpsc};

use crate::{
    abi::Abi,
    error::Result,
    init::FORGE,
    watcher::{self, Match},
};

pub struct Forge {
    pub(crate) watch_path: Option<PathBuf>,
    watcher_snd: mpsc::UnboundedSender<watcher::WatcherMsg>,
    result_snd: mpsc::UnboundedSender<Match>,
    abis_by_path: BTreeMap<PathBuf, Abi>,
}

static FUZZ_DIFF_THRESHOLD: f64 = 0.2;

impl Default for Forge {
    fn default() -> Self {
        let (result_snd, result_rcv) = mpsc::unbounded_channel();
        let (watcher_snd, watcher_rcv) = mpsc::unbounded_channel();
        let result_snd_clone = result_snd.clone();

        spawn(async { handle_events(result_rcv).await.unwrap() });
        spawn(async {
            watcher::async_watch(result_snd_clone, watcher_rcv)
                .await
                .unwrap()
        });

        Self {
            watch_path: None,
            watcher_snd,
            result_snd,
            abis_by_path: BTreeMap::new(),
        }
    }
}

impl Forge {
    pub(crate) fn get_abi_for(&self, code: Bytes) -> Option<Abi> {
        self.abis_by_path
            .values()
            .find(|abi| diff_score(&abi.code, &code) < FUZZ_DIFF_THRESHOLD)
            .cloned()
    }

    pub(crate) async fn watch(&mut self, path: PathBuf) -> Result<()> {
        self.unwatch().await?;

        tracing::trace!("watching {:?}", path);

        // watch the new path
        self.watch_path = Some(path.clone());
        self.watcher_snd
            .send(watcher::WatcherMsg::Start(path.clone()))?;

        let snd = self.result_snd.clone();
        spawn(async { watcher::scan_glob(path, snd).await.unwrap() });

        Ok(())
    }

    // stop current path watch if necessary
    pub(crate) async fn unwatch(&mut self) -> Result<()> {
        tracing::trace!("unwatching {:?}", self.watch_path);

        if let Some(path) = &self.watch_path.take() {
            self.watcher_snd
                .send(watcher::WatcherMsg::Stop(path.clone()))?;
        }

        Ok(())
    }

    /// indexes a new known ABI
    fn insert_abi(&mut self, abi: Abi) {
        self.abis_by_path.insert(abi.path.clone(), abi);
    }

    /// removes a previously known ABI by their path
    fn remove_abi(&mut self, path: PathBuf) {
        self.abis_by_path.remove(&path);
    }
}

/// Handlers ABI file events
async fn handle_events(mut rcv: mpsc::UnboundedReceiver<Match>) -> Result<()> {
    while let Some(m) = rcv.recv().await {
        let mut forge = FORGE.write().await;
        if let Ok(abi) = Abi::try_from_match(m.clone()) {
            forge.insert_abi(abi);
        } else {
            forge.remove_abi(m.full_path);
        }
    }

    Ok(())
}

/// Very simple fuzzy matching of contract bytecode.
///
/// Will fail for small contracts that are essentially all immutable variables.
/// Taken from https://github.com/foundry-rs/foundry/blob/02e430c20fb7ba1794f5cabdd7eb73182baf4e7e/common/src/contracts.rs#L96-L114
pub fn diff_score(a: &[u8], b: &[u8]) -> f64 {
    let cutoff_len = usize::min(a.len(), b.len());
    if cutoff_len == 0 {
        return 1.0;
    }

    let a = &a[..cutoff_len];
    let b = &b[..cutoff_len];
    let mut diff_chars = 0;
    for i in 0..cutoff_len {
        if a[i] != b[i] {
            diff_chars += 1;
        }
    }
    diff_chars as f64 / cutoff_len as f64
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use ethers::types::Bytes;

    use super::*;

    #[test]
    fn test() {
        let forge = Bytes::from_str("0x6080604052348015600f57600080fd5b5060043610603c5760003560e01c8063243dc8da146041578063a10a6819146056578063dc80035d146080575b600080fd5b60005460405190815260200160405180910390f35b607e7f0000000000000000000000000000000000000000000000000000000000000000600055565b005b607e608b3660046090565b600055565b60006020828403121560a157600080fd5b503591905056fea26469706673582212201b6eea80fa9d695c35c1d3f39e1a44e9e108da8c1558fd243e2afff27e1e5c6564736f6c634300080d0033").unwrap();

        let onchain = Bytes::from_str("0x6080604052348015600f57600080fd5b5060043610603c5760003560e01c8063243dc8da146041578063a10a6819146056578063dc80035d146080575b600080fd5b60005460405190815260200160405180910390f35b607e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600055565b005b607e608b3660046090565b600055565b60006020828403121560a157600080fd5b503591905056fea26469706673582212201b6eea80fa9d695c35c1d3f39e1a44e9e108da8c1558fd243e2afff27e1e5c6564736f6c634300080d0033").unwrap();

        assert!(diff_score(&forge, &onchain) < FUZZ_DIFF_THRESHOLD);
    }
}
