mod affinity;
mod contracts;
pub mod dedup_chain_id;
pub mod events;
mod global_state;
mod network;
mod new_network_params;
mod tokens;
pub mod transactions;
pub mod ui_events;
pub use affinity::Affinity;
pub use alloy::primitives::{address, Address, B256, U256, U64};
pub use contracts::{Contract, ContractWithAbi};
pub use dedup_chain_id::DedupChainId;
pub use events::Event;
pub use global_state::GlobalState;
pub use network::Network;
pub use new_network_params::NewNetworkParams;
pub use tokens::{
    Erc1155Token, Erc1155TokenData, Erc721Collection, Erc721Token, Erc721TokenData,
    Erc721TokenDetails, TokenBalance, TokenMetadata,
};
pub use ui_events::UINotify;

pub type Json = serde_json::Value;

#[derive(Debug)]
pub struct SerializableError(pub color_eyre::Report);

impl std::fmt::Display for SerializableError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for SerializableError {}

impl serde::Serialize for SerializableError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl From<color_eyre::Report> for SerializableError {
    fn from(err: color_eyre::Report) -> Self {
        Self(err)
    }
}

pub type TauriResult<T> = std::result::Result<T, SerializableError>;

#[derive(Debug, Default)]
pub struct SyncUpdates {
    pub events: Option<Vec<Event>>,
    pub erc20_balances: Option<Vec<(Address, U256)>>,
    pub native_balance: Option<U256>,
    pub tip: Option<u64>,
}
