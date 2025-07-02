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

use color_eyre::eyre::eyre;
use ethui_types::{Address, UINotify};
pub use init::init;
use kameo::reply::Reply;
use migrations::LatestVersion;
use onboarding::{Onboarding, OnboardingStep};
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

    pub async fn set(
        &mut self,
        params: serde_json::Map<String, serde_json::Value>,
    ) -> color_eyre::Result<()> {
        if let Some(v) = params.get("darkMode") {
            self.inner.dark_mode = serde_json::from_value(v.clone()).unwrap()
        }

        if let Some(v) = params.get("abiWatchPath") {
            self.inner.abi_watch_path = serde_json::from_value(v.clone()).unwrap()
        }

        if let Some(v) = params.get("alchemyApiKey") {
            self.inner.alchemy_api_key = serde_json::from_value(v.clone()).unwrap()
        }

        if let Some(v) = params.get("etherscanApiKey") {
            self.inner.etherscan_api_key = serde_json::from_value(v.clone()).unwrap()
        }

        if let Some(v) = params.get("hideEmptyTokens") {
            self.inner.hide_empty_tokens = serde_json::from_value(v.clone()).unwrap()
        }

        if let Some(v) = params.get("autostart") {
            self.inner.autostart = serde_json::from_value(v.clone()).unwrap();
            crate::autostart::update(self.inner.autostart)?;
        }

        if let Some(v) = params.get("startMinimized") {
            self.inner.start_minimized = serde_json::from_value(v.clone()).unwrap();
        }

        if let Some(v) = params.get("fastMode") {
            self.inner.fast_mode = serde_json::from_value(v.clone()).unwrap();
        }

        if let Some(v) = params.get("rustLog") {
            self.inner.rust_log = serde_json::from_value(v.clone()).unwrap();
            ethui_tracing::parse(&self.inner.rust_log)?;
        }

        self.save().await?;

        Ok(())
    }

    pub async fn finish_onboarding_step(&mut self, step: OnboardingStep) -> color_eyre::Result<()> {
        self.inner.onboarding.finish_step(step);
        self.save().await?;

        Ok(())
    }

    pub async fn finish_onboarding(&mut self) -> color_eyre::Result<()> {
        self.inner.onboarding.finish();
        self.save().await?;

        Ok(())
    }

    pub async fn set_dark_mode(&mut self, mode: DarkMode) -> color_eyre::Result<()> {
        self.inner.dark_mode = mode;
        self.save().await?;

        Ok(())
    }

    pub async fn set_fast_mode(&mut self, mode: bool) -> color_eyre::Result<()> {
        self.inner.fast_mode = mode;
        self.save().await?;

        Ok(())
    }

    pub fn get(&self) -> &SerializedSettings {
        &self.inner
    }

    pub fn fast_mode(&self) -> bool {
        self.inner.fast_mode
    }

    pub fn start_minimized(&self) -> bool {
        self.inner.start_minimized
    }

    pub fn get_etherscan_api_key(&self) -> color_eyre::Result<String> {
        self.inner
            .etherscan_api_key
            .clone()
            .ok_or(eyre!("Etherscan key not set"))
    }

    pub fn get_alias(&self, address: Address) -> Option<String> {
        self.inner.aliases.get(&address).cloned()
    }

    pub async fn set_alias(
        &mut self,
        address: Address,
        alias: Option<String>,
    ) -> color_eyre::Result<()> {
        // trim whitespaces
        // empty str becomes None
        let alias = alias.map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());

        if let Some(alias) = alias {
            self.inner.aliases.insert(address, alias);
        } else {
            self.inner.aliases.remove(&address);
        }
        self.save().await?;
        Ok(())
    }

    // Persists current state to disk
    pub async fn save(&self) -> color_eyre::Result<()> {
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
