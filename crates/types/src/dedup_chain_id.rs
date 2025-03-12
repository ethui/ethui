use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
pub struct DedupChainId {
    chain_id: u32,
    dedup_id: Option<u32>,
}

impl DedupChainId {
    pub fn chain_id(&self) -> u32 {
        self.chain_id
    }

    pub fn dedup_id(&self) -> Option<u32> {
        self.dedup_id
    }
}

impl From<(u32, Option<u32>)> for DedupChainId {
    fn from(value: (u32, Option<u32>)) -> Self {
        DedupChainId {
            chain_id: value.0,
            dedup_id: value.1,
        }
    }
}

impl From<DedupChainId> for (u32, Option<u32>) {
    fn from(dedup_chain_id: DedupChainId) -> (u32, Option<u32>) {
        (dedup_chain_id.chain_id, dedup_chain_id.dedup_id)
    }
}
