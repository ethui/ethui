use std::path::PathBuf;

use iron_types::AppEvent;
use once_cell::sync::OnceCell;
use tokio::sync::mpsc;

pub static SETTINGS_PATH: OnceCell<PathBuf> = OnceCell::new();

/// a global sender used internally to go through the app's event loop, which is required for
/// opening dialogs
pub static APP_SND: OnceCell<mpsc::UnboundedSender<AppEvent>> = OnceCell::new();
