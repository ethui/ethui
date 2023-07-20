use std::collections::HashMap;

use iron_types::UISender;
use once_cell::sync::{Lazy, OnceCell};
use tokio::sync::Mutex;

type PendingDialogMap = HashMap<u32, super::handle::Dialog>;

/// a sender used internally to go through the app's event loop, which is required for
/// opening dialogs
pub static APP_SND: OnceCell<UISender> = OnceCell::new();

/// global map of pending dialogs
pub(super) static OPEN_DIALOGS: Lazy<Mutex<PendingDialogMap>> = Lazy::new(Default::default);

pub fn init(window_snd: UISender) {
    APP_SND.set(window_snd).unwrap();
}
