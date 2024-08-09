mod init;
mod types;
pub mod feed;
pub mod error;
pub mod commands;

pub use error::{Error, Result};
pub use init::init;
