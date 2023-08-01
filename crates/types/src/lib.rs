mod checksummed_address;
pub mod events;
mod global_state;
mod tokens;
pub mod ui_events;

pub use checksummed_address::ChecksummedAddress;
use ethers::types::{Address, U256};
pub use events::Event;
pub use global_state::GlobalState;
pub use tokens::{TokenBalance, TokenMetadata};
pub use ui_events::UINotify;

pub type Json = serde_json::Value;

#[derive(Debug, Default)]
pub struct SyncUpdates {
    pub events: Option<Vec<Event>>,
    pub erc20_balances: Option<Vec<(Address, U256)>>,
    pub native_balance: Option<U256>,
    pub tip: Option<u64>,
}
