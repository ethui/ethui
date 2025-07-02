pub mod actor;
mod autostart;
pub mod commands;
mod init;
mod migrations;
mod onboarding;
mod utils;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

pub use actor::*;
use ethui_types::{Address, UINotify};
pub use init::init;
use kameo::reply::Reply;
use migrations::LatestVersion;
use onboarding::Onboarding;
use serde::{Deserialize, Serialize};
use serde_constant::ConstI64;
pub use utils::test_alchemy_api_key;

#[derive(Debug, Clone)]
pub struct Settings {
    pub inner: SerializedSettings,

    file: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DarkMode {
    Auto,
    Dark,
    Light,
}

impl Settings {
    pub async fn init(&self) -> color_eyre::Result<()> {
        // make sure OS's autostart is synced with settings
        crate::autostart::update(self.inner.autostart)?;
        ethui_tracing::reload(&self.inner.rust_log)?;

        Ok(())
    }

    // Persists current state to disk
    async fn save(&self) -> color_eyre::Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        ethui_tracing::reload(&self.inner.rust_log)?;
        serde_json::to_writer_pretty(file, &self.inner)?;
        ethui_broadcast::settings_updated().await;
        ethui_broadcast::ui_notify(UINotify::SettingsChanged).await;

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedSettings {
    pub dark_mode: DarkMode,

    pub abi_watch_path: Option<String>,
    pub alchemy_api_key: Option<String>,
    pub etherscan_api_key: Option<String>,
    #[serde(default = "default_true")]
    pub hide_empty_tokens: bool,

    #[serde(default = "default_aliases")]
    pub aliases: HashMap<Address, String>,

    #[serde(default)]
    pub fast_mode: bool,

    #[serde(default)]
    pub autostart: bool,

    #[serde(default)]
    pub start_minimized: bool,

    #[serde(default)]
    pub rust_log: String,

    #[serde(default)]
    pub onboarding: Onboarding,

    version: LatestVersion,
}

impl Default for SerializedSettings {
    fn default() -> Self {
        Self {
            dark_mode: DarkMode::Auto,
            abi_watch_path: None,
            alchemy_api_key: None,
            etherscan_api_key: None,
            hide_empty_tokens: true,
            aliases: HashMap::new(),
            fast_mode: false,
            autostart: false,
            start_minimized: false,
            rust_log: "warn".into(),
            version: ConstI64,
            onboarding: Onboarding::default(),
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_aliases() -> HashMap<Address, String> {
    Default::default()
}

impl Reply for SerializedSettings {
    type Ok = Self;
    type Error = color_eyre::Report;
    type Value = Self;

    fn to_result(self) -> color_eyre::Result<Self::Ok> {
        Ok(self)
    }

    fn into_any_err(self) -> Option<Box<dyn kameo::reply::ReplyError>> {
        None
    }

    fn into_value(self) -> Self::Value {
        self
    }
}
