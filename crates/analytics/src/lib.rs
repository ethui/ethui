use std::{collections::HashMap, sync::OnceLock};

use ethui_settings::{SettingsActorExt as _, settings};
use ethui_types::prelude::*;
use tauri::AppHandle;
#[cfg(feature = "aptabase")]
use tauri_plugin_aptabase::EventTracker as _;
use uuid::Uuid;

mod init;
pub use init::init;

static ANALYTICS: OnceLock<Analytics> = OnceLock::new();

pub struct Analytics {
    user_id: Uuid,
}

impl Analytics {
    fn new(user_id: Uuid) -> Self {
        Self { user_id }
    }

    pub fn instance() -> &'static Analytics {
        ANALYTICS.get_or_init(|| Analytics::new(Uuid::new_v4()))
    }

    async fn init_from_settings() -> Self {
        let user_id = match settings().get_all().await {
            Ok(settings) => match settings.analytics_id {
                Some(id) => match Uuid::parse_str(&id) {
                    Ok(parsed) => parsed,
                    Err(_) => {
                        let id = Uuid::new_v4();
                        let _ = settings()
                            .set_analytics_id(id.to_string())
                            .await
                            .map_err(|err| error!("failed to save analytics id: {err}"));
                        id
                    }
                },
                None => {
                    let id = Uuid::new_v4();
                    let _ = settings()
                        .set_analytics_id(id.to_string())
                        .await
                        .map_err(|err| error!("failed to save analytics id: {err}"));
                    id
                }
            },
            Err(err) => {
                error!("failed to load settings for analytics id: {err}");
                Uuid::new_v4()
            }
        };

        Self::new(user_id)
    }

    pub fn get_common_properties(&self) -> HashMap<String, serde_json::Value> {
        let mut props = HashMap::new();
        props.insert("user_id".to_string(), self.user_id.to_string().into());
        props
    }
}

#[instrument(skip(handle, _handle))]
pub fn track_event(
    #[cfg(feature = "aptabase")] handle: &AppHandle,
    #[cfg(not(feature = "aptabase"))] _handle: &AppHandle,
    event_name: &str,
    properties: Option<HashMap<String, serde_json::Value>>,
) -> Result<()> {
    let analytics = Analytics::instance();
    let mut full = analytics.get_common_properties();
    full.extend(properties.unwrap_or_default());

    debug!(properties = ?full);

    #[cfg(feature = "aptabase")]
    {
        let json = serde_json::to_value(full)?;
        if let Err(e) = handle.track_event(event_name, Some(json)) {
            error!("Error tracking event: {e}");
        }
    }

    Ok(())
}
