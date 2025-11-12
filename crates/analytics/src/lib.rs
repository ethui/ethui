use std::{collections::HashMap, sync::OnceLock};

use ethui_types::prelude::*;
use tauri::AppHandle;
use uuid::Uuid;

mod init;
pub use init::init;

static ANALYTICS: OnceLock<Analytics> = OnceLock::new();

pub struct Analytics {
    user_id: Uuid,
}

impl Analytics {
    fn new() -> Self {
        let user_id = Self::get_machine_based_user_id();
        Self { user_id }
    }

    pub fn instance() -> &'static Analytics {
        ANALYTICS.get_or_init(Analytics::new)
    }

    fn get_machine_based_user_id() -> Uuid {
        let machine_id = Self::get_machine_identifier();
        let mut buf = [0u8; 16];
        let bytes = machine_id.as_bytes();
        let len = bytes.len().min(16);
        buf[..len].copy_from_slice(&bytes[..len]);
        Uuid::new_v8(buf)
    }

    fn get_machine_identifier() -> String {
        if let Ok(Some(mac_addr)) = mac_address::get_mac_address() {
            return mac_addr.to_string();
        }

        if let Ok(hostname) = hostname::get().map(|h| h.to_string_lossy().to_string())
            && !hostname.is_empty()
        {
            return format!("fallback-{hostname}");
        }
        "fallback-unknown-machine".to_string()
    }

    pub fn get_common_properties(&self) -> HashMap<String, serde_json::Value> {
        let mut props = HashMap::new();
        props.insert("user_id".to_string(), self.user_id.to_string().into());
        props
    }
}

pub fn track_event(
    handle: &AppHandle,
    event_name: &str,
    properties: Option<HashMap<String, serde_json::Value>>,
) -> Result<()> {
    let analytics = Analytics::instance();
    let mut full = analytics.get_common_properties();
    full.extend(properties.unwrap_or_default());

    debug!(properties = ?full);
    track_via_aptabase(handle, full, event_name)?;

    Ok(())
}

#[cfg(all(feature = "aptabase", not(feature = "nix")))]
fn track_via_aptabase(
    handle: &AppHandle,
    data: HashMap<String, serde_json::Value>,
    event_name: &str,
) -> Result<()> {
    use tauri_plugin_aptabase::EventTracker as _;

    let json = serde_json::to_value(data)?;
    if let Err(e) = handle.track_event(event_name, Some(json)) {
        error!("Error tracking event: {e}");
    }

    Ok(())
}
