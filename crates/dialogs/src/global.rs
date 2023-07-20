use std::collections::HashMap;

use iron_types::AppEvent;
use once_cell::sync::{Lazy, OnceCell};
use tokio::sync::{mpsc, Mutex};

/// a sender used internally to go through the app's event loop, which is required for
/// opening dialogs
pub static APP_SND: OnceCell<mpsc::UnboundedSender<AppEvent>> = OnceCell::new();

pub fn init(window_snd: mpsc::UnboundedSender<AppEvent>) {
    APP_SND.set(window_snd).unwrap();
}

type PendingDialogMap = HashMap<u32, super::handle::Dialog>;

pub(super) static OPEN_DIALOGS: Lazy<Mutex<PendingDialogMap>> = Lazy::new(Default::default);
