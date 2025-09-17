mod affinity;
mod contracts;
mod error;
pub mod events;
mod global_state;
mod network;
mod new_network_params;
pub mod prelude;
mod tokens;
pub mod transactions;
pub mod ui_events;
pub use affinity::Affinity;
pub use alloy::primitives::{address, Address, B256, U256, U64};
pub use color_eyre::eyre::eyre;
pub use contracts::{Contract, ContractWithAbi};
pub use error::{SerializableError, TauriResult};
pub use events::Event;
pub use global_state::GlobalState;
pub use network::{Network, NetworkId, NetworkStatus};
pub use new_network_params::NewNetworkParams;
pub use tokens::{
    Erc1155Token, Erc1155TokenData, Erc721Collection, Erc721Token, Erc721TokenData,
    Erc721TokenDetails, TokenBalance, TokenMetadata,
};
pub use ui_events::UINotify;

pub type Json = serde_json::Value;

#[derive(Debug, Default)]
pub struct SyncUpdates {
    pub events: Option<Vec<Event>>,
    pub erc20_balances: Option<Vec<(Address, U256)>>,
    pub native_balance: Option<U256>,
    pub tip: Option<u64>,
}
