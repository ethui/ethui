use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub struct NetworkId {
    chain_id: u32,
    dedup_id: u32,
}

impl NetworkId {
    pub fn chain_id(&self) -> u32 {
        self.chain_id
    }

    pub fn dedup_id(&self) -> u32 {
        self.dedup_id
    }

    pub fn from<X: Into<u32>, Y: Into<u32>>(chain_id: X, dedup_id: Y) -> Self {
        (chain_id, dedup_id).into()
    }
}

impl<X, Y> From<(X, Y)> for NetworkId
where
    X: Into<u32>,
    Y: Into<u32>,
{
    fn from((chain_id, dedup_id): (X, Y)) -> Self {
        Self {
            chain_id: chain_id.into(),
            dedup_id: dedup_id.into(),
        }
    }
}

impl From<NetworkId> for (u32, u32) {
    fn from(id: NetworkId) -> (u32, u32) {
        (id.chain_id, id.dedup_id)
    }
}
