use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Affinity {
    #[default]
    Unset,
    Global,
    Sticky(u32),
}

impl From<u32> for Affinity {
    fn from(chain_id: u32) -> Self {
        Affinity::Sticky(chain_id)
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
