use ethui_types::NetworkId;
use serde::{Deserialize, Serialize};

/// The various ways to find a network
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum NetworkGetKey {
    Id(NetworkId),
    ChainId(u32),
    Name(String),
}

impl From<NetworkId> for NetworkGetKey {
    fn from(id: NetworkId) -> Self {
        NetworkGetKey::Id(id)
    }
}

impl From<u32> for NetworkGetKey {
    fn from(chain_id: u32) -> Self {
        NetworkGetKey::ChainId(chain_id)
    }
}

impl From<String> for NetworkGetKey {
    fn from(name: String) -> Self {
        NetworkGetKey::Name(name)
    }
}

impl From<&str> for NetworkGetKey {
    fn from(name: &str) -> Self {
        NetworkGetKey::Name(name.to_string())
    }
}
