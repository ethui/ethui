use std::collections::HashMap;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[cfg(feature = "aptabase")]
use tauri_plugin_aptabase::EventTracker as _;

static ANALYTICS: OnceLock<Analytics> = OnceLock::new();

pub struct Analytics {
    user_id: Uuid,
    is_dev_mode: bool,
}

impl Analytics {
    fn new() -> Self {
        let user_id = Self::get_machine_based_user_id(); 
        Self {
            user_id,
            is_dev_mode: cfg!(debug_assertions),
        }
    }

    pub fn instance() -> &'static Analytics {
        ANALYTICS.get_or_init(|| Analytics::new())
    }
   
    fn get_machine_based_user_id() -> Uuid {
        let machine_id = Self::get_machine_identifier();
        let namespace = Uuid::parse_str("6ba7b810-9dad-11d1-80b4-00c04fd430c8").unwrap(); 
        Uuid::new_v5(&namespace, machine_id.as_bytes())
    }
  
    fn get_machine_identifier() -> String {      
        if let Ok(mac) = mac_address::get_mac_address() {
            if let Some(mac_addr) = mac {
                return mac_addr.to_string();
            }
        }

        if let Ok(hostname) = hostname::get() {
            if let Ok(hostname_str) = hostname.into_string() {
                if !hostname_str.is_empty() {
                    return format!("fallback-{}", hostname_str);
                }
            }
        }       
        "fallback-unknown-machine".to_string()
    }

    pub fn get_common_properties(&self) -> HashMap<String, serde_json::Value> {
        let mut props = HashMap::new();
        props.insert("user_id".to_string(), self.user_id.to_string().into());
        props.insert("dev_mode".to_string(), self.is_dev_mode.into());
        props
    }
}

pub fn init_tauri_state(handle: &AppHandle) {
    // Store the singleton instance in Tauri state for Aptabase integration
    let analytics = Analytics::instance();
    handle.manage(analytics);
}

pub fn track_event(
    handle: &AppHandle, 
    event_name: &str, 
    properties: Option<HashMap<String, serde_json::Value>>
) {
    let analytics = Analytics::instance();
    
    #[cfg(feature = "aptabase")]
    {
        let mut final_props = analytics.get_common_properties();
        if let Some(props) = properties {
            final_props.extend(props);
        }
        let final_props_value = serde_json::to_value(final_props).unwrap();
        let _ = handle.track_event(event_name, Some(final_props_value));
    }
    
    #[cfg(not(feature = "aptabase"))]
    {    
        let final_props = if let Some(mut props) = properties {
            let common = analytics.get_common_properties();
            props.extend(common);
            props
        } else {
            analytics.get_common_properties()
        };
        
        tracing::info!(
            "Analytics event: {} with properties: {:?}",
            event_name,
            final_props
        );
    }
}
