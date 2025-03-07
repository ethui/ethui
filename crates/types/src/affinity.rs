use serde::{Deserialize, Serialize};

use crate::DedupChainId;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Affinity {
    #[default]
    Unset,
    Global,
    Sticky(DedupChainId),
}

impl From<(u32, u32)> for Affinity {
    fn from(internal_id: (u32, u32)) -> Self {
        Affinity::Sticky(internal_id.into())
    }
}

impl From<DedupChainId> for Affinity {
    fn from(internal_id: DedupChainId) -> Self {
        Affinity::Sticky(internal_id)
    }
}

impl Affinity {
    pub fn is_unset(&self) -> bool {
        self == &Affinity::Unset
    }

    pub fn is_global(&self) -> bool {
        self == &Affinity::Global
    }
}
