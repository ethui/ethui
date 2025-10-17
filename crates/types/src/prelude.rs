pub use std::{
    collections::{HashMap, HashSet},
    default,
    str::FromStr as _,
    sync::Arc,
};

pub use alloy::primitives::{Address, B256, Bytes, U64, U256, address};
pub use color_eyre::eyre::{Context as _, ContextCompat as _, Result, WrapErr, eyre};
pub use serde::{Deserialize, Serialize};
pub use serde_json::{Value as Json, json};
pub use tokio::{
    sync::{RwLock, RwLockReadGuard, RwLockWriteGuard},
    time::Duration,
};
pub use tracing::{debug, error, info, instrument, trace, warn};

pub use crate::{
    error::{SerializableError, TauriResult},
    global_state::GlobalState,
    network::{Network, NetworkId},
    ui_events::UINotify,
};
