mod client;
pub mod commands;
mod crypto;
mod error;
mod pairing;
mod session;
mod store;

pub mod init;

use std::sync::OnceLock;

pub use init::{init, shutdown};
use relay_client::websocket::Client;
pub use store::Session;

/// Global relay client. Set during [`init`]; `None` if initialisation was skipped.
pub(crate) static CLIENT: OnceLock<Client> = OnceLock::new();
