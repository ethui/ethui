use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub struct DedupChainId {
    chain_id: u32,
    dedup_id: i32,
}

impl DedupChainId {
    pub fn chain_id(&self) -> u32 {
        self.chain_id
    }

    pub fn dedup_id(&self) -> i32 {
        self.dedup_id
    }
}

impl From<(u32, i32)> for DedupChainId {
    fn from(internal_id: (u32, i32)) -> Self {
        DedupChainId {
            chain_id: internal_id.0,
            dedup_id: internal_id.1,
        }
    }
}

impl From<DedupChainId> for (u32, i32) {
    fn from(dedup_chain_id: DedupChainId) -> (u32, i32) {
        (dedup_chain_id.chain_id, dedup_chain_id.dedup_id)
    }
}
