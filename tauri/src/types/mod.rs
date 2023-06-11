mod checksummed_address;
pub mod events;
mod global_state;

pub use checksummed_address::ChecksummedAddress;
pub use events::Event;
pub use global_state::GlobalState;

pub type Json = serde_json::Value;
