#![allow(dead_code)]

mod abi;
pub mod commands;
pub mod error;
mod init;
mod watcher;

use std::collections::BTreeMap;
use std::path::PathBuf;

pub use error::{Error, Result};
use ethers::types::Bytes;
pub use init::init;
use once_cell::sync::Lazy;
use tokio::{
    spawn,
    sync::{mpsc, RwLock},
};

use self::watcher::Match;

#[derive(Default)]
pub struct Forge {
    abis_by_path: BTreeMap<PathBuf, abi::Abi>,
}

static FORGE: Lazy<RwLock<Forge>> = Lazy::new(Default::default);
static FUZZ_DIFF_THRESHOLD: f64 = 0.2;

impl Forge {
    fn get_abi_for(&self, code: Bytes) -> Option<abi::Abi> {
        self.abis_by_path
            .values()
            .find(|abi| diff_score(&abi.code, &code) < FUZZ_DIFF_THRESHOLD)
            .cloned()
    }

    /// starts the ABI watcher service
    async fn watch(path: String) -> Result<()> {
        let (snd, rcv) = mpsc::unbounded_channel();
        let snd_clone = snd.clone();
        let path_clone = path.clone();

        // spawn file watcher
        spawn(async { watcher::async_watch(path, snd_clone).await.unwrap() });
        // spawn initial file globber
        spawn(async { watcher::scan_glob(path_clone, snd).await.unwrap() });
        // spawn event handler
        spawn(async { Self::handle_events(rcv).await.unwrap() });

        Ok(())
    }

    /// Handlers ABI file events
    async fn handle_events(mut rcv: mpsc::UnboundedReceiver<Match>) -> Result<()> {
        while let Some(m) = rcv.recv().await {
            let mut foundry = FORGE.write().await;
            if let Ok(abi) = abi::Abi::try_from_match(m.clone()) {
                foundry.insert_known_abi(abi);
            } else {
                foundry.remove_known_abi(m.full_path);
            }
        }

        Ok(())
    }

    // indexes a new known ABI
    fn insert_known_abi(&mut self, abi: abi::Abi) {
        tracing::trace!("insert ABI: {:?}", abi.path);
        self.abis_by_path.insert(abi.path.clone(), abi);
    }

    // removes a previously known ABI by their path
    fn remove_known_abi(&mut self, path: PathBuf) {
        self.abis_by_path.remove(&path);
    }
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
