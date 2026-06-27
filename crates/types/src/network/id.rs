use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub struct NetworkId {
    chain_id: u64,
    dedup_id: u64,
}

impl NetworkId {
    pub fn chain_id(&self) -> u64 {
        self.chain_id
    }

    pub fn dedup_id(&self) -> u64 {
        self.dedup_id
    }

    pub fn from<X: Into<u64>, Y: Into<u64>>(chain_id: X, dedup_id: Y) -> Self {
        (chain_id, dedup_id).into()
    }
}

impl<X, Y> From<(X, Y)> for NetworkId
where
    X: Into<u64>,
    Y: Into<u64>,
{
    fn from((chain_id, dedup_id): (X, Y)) -> Self {
        Self {
            chain_id: chain_id.into(),
            dedup_id: dedup_id.into(),
        }
    }
}

impl From<NetworkId> for (u64, u64) {
    fn from(id: NetworkId) -> (u64, u64) {
        (id.chain_id, id.dedup_id)
    }
}
