use crate::{prelude::*, DedupChainId};

#[derive(Clone, Copy, Debug, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Affinity {
    #[default]
    Unset,
    Global,
    Sticky(DedupChainId),
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
