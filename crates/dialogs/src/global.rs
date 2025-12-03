use common::prelude::*;
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

use crate::handle::DialogStore;

type PendingDialogMap = HashMap<u32, DialogStore>;

/// global map of pending dialogs
pub(super) static OPEN_DIALOGS: Lazy<Mutex<PendingDialogMap>> = Lazy::new(Default::default);
