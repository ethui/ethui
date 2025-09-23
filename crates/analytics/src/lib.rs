use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[cfg(feature = "aptabase")]
use tauri_plugin_aptabase::EventTracker as _;

pub struct Analytics {
    user_id: Uuid,
    is_dev_mode: bool,
}

impl Analytics {
    pub fn new() -> Self {
        let user_id = Self::get_machine_based_user_id(); 
        Self {
            user_id,
            is_dev_mode: cfg!(debug_assertions),
        }
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

    fn common_properties(&self) -> HashMap<String, serde_json::Value> {
        let mut props = HashMap::new();
        props.insert("user_id".to_string(), self.user_id.to_string().into());
        props.insert("dev_mode".to_string(), self.is_dev_mode.into());
        props
    }
  
    pub fn track_event(
        &self,
        handle: &AppHandle,
        event_name: &str,
        properties: Option<HashMap<String, serde_json::Value>>,
    ) {
        #[cfg(feature = "aptabase")]
        {
            let mut final_props = self.common_properties();
            if let Some(props) = properties {
                final_props.extend(props);
            }           
            let _ = handle.track_event(event_name, Some(final_props));
        }
        
        #[cfg(not(feature = "aptabase"))]
        {
            let final_props = if let Some(mut props) = properties {
                let common = self.common_properties();
                props.extend(common);
                props
            } else {
                self.common_properties()
            };
            
            tracing::info!(
                "Analytics event: {} with properties: {:?}",
                event_name,
                final_props
            );
        }
    }
}

pub fn get_analytics(handle: &AppHandle) -> Option<tauri::State<'_, Analytics>> {
    handle.try_state::<Analytics>()
}

pub fn track_event(
    handle: &AppHandle, 
    event_name: &str, 
    properties: Option<HashMap<String, serde_json::Value>>
) {
    #[cfg(feature = "aptabase")]
    {
        if let Some(analytics) = get_analytics(handle) {
            analytics.track_event(handle, event_name, properties);
        }
    }
    
    #[cfg(not(feature = "aptabase"))]
    {
        let machine_uuid = Analytics::get_machine_based_user_id();
        let is_dev = cfg!(debug_assertions);
        
        let final_props = if let Some(mut props) = properties {
            props.insert("user_id".to_string(), machine_uuid.to_string().into());
            props.insert("dev_mode".to_string(), is_dev.into());
            props
        } else {
            let mut props = HashMap::new();
            props.insert("user_id".to_string(), machine_uuid.to_string().into());
            props.insert("dev_mode".to_string(), is_dev.into());
            props
        };
        
        tracing::info!(
            "Analytics event: {} with properties: {:?}",
            event_name,
            final_props
        );
    }
}
