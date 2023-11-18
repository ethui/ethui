mod error;
mod init;
mod routes;
mod utils;

pub use error::{Error, Result};
pub use init::init;
use init::Ctx;

pub use utils::request_main_window_open;
