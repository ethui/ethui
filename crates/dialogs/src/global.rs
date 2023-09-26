use std::collections::HashMap;

use once_cell::sync::Lazy;
use tokio::sync::Mutex;

type PendingDialogMap = HashMap<u32, super::handle::Dialog>;

/// global map of pending dialogs
pub(super) static OPEN_DIALOGS: Lazy<Mutex<PendingDialogMap>> = Lazy::new(Default::default);
