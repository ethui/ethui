pub mod commands;
mod error;
mod global;
mod handle;
mod presets;
mod utils;

pub use error::{Error, Result};
pub use handle::{Dialog, DialogMsg};
pub use utils::dialog_close;
