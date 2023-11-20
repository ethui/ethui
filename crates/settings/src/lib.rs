mod autostart;
pub mod commands;
mod error;
mod init;
mod utils;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
    str::FromStr,
};

pub use init::init;
use iron_types::{Address, UINotify};
use serde::{Deserialize, Serialize};
pub use utils::test_alchemy_api_key;

pub use self::error::{Error, Result};

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
    pub async fn init(&self) -> Result<()> {
        // make sure OS's autostart is synced with settings
        crate::autostart::update(self.inner.autostart)?;

        Ok(())
    }

    pub async fn set(&mut self, params: serde_json::Map<String, serde_json::Value>) -> Result<()> {
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

        self.save().await?;

        Ok(())
    }

    pub async fn set_dark_mode(&mut self, mode: DarkMode) -> Result<()> {
        self.inner.dark_mode = mode;
        self.save().await?;

        Ok(())
    }

    pub async fn set_fast_mode(&mut self, mode: bool) -> Result<()> {
        self.inner.fast_mode = mode;
        self.save().await?;

        Ok(())
    }

    pub async fn finish_onboarding(&mut self) -> Result<()> {
        self.inner.onboarded = true;
        self.save().await?;

        Ok(())
    }

    pub async fn finish_homepage_tour(&mut self) -> Result<()> {
        self.inner.homepage_tour_completed = true;
        self.save().await?;

        Ok(())
    }

    pub fn get(&self) -> &SerializedSettings {
        &self.inner
    }

    pub fn onboarded(&self) -> bool {
        self.inner.onboarded
    }

    pub fn homepage_tour_completed(&self) -> bool {
        self.inner.homepage_tour_completed
    }

    pub fn fast_mode(&self) -> bool {
        self.inner.fast_mode
    }

    pub fn get_etherscan_api_key(&self) -> Result<String> {
        self.inner
            .etherscan_api_key
            .clone()
            .ok_or(Error::EtherscanKeyNotSet)
    }

    fn get_alias(&self, address: Address) -> Option<String> {
        self.inner.aliases.get(&address).cloned()
    }

    fn set_alias(&mut self, address: Address, alias: Option<String>) {
        // trim whitespaces
        // empty str becomes None
        let alias = alias.map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());

        if let Some(alias) = alias {
            self.inner.aliases.insert(address, alias);
        } else {
            self.inner.aliases.remove(&address);
        }
    }

    // Persists current state to disk
    async fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, &self.inner)?;
        iron_broadcast::settings_updated().await;
        iron_broadcast::ui_notify(UINotify::SettingsChanged).await;

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
    aliases: HashMap<Address, String>,

    #[serde(default)]
    onboarded: bool,

    #[serde(default)]
    homepage_tour_completed: bool,

    #[serde(default)]
    fast_mode: bool,

    #[serde(default)]
    autostart: bool,
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
            onboarded: false,
            homepage_tour_completed: false,
            fast_mode: false,
            autostart: false,
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_aliases() -> HashMap<Address, String> {
    let mut res = HashMap::new();
    res.insert(
        Address::from_str("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266").unwrap(),
        "alice".into(),
    );
    res.insert(
        Address::from_str("0x70997970C51812dc3A010C7d01b50e0d17dc79C8").unwrap(),
        "bob".into(),
    );
    res.insert(
        Address::from_str("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC").unwrap(),
        "charlie".into(),
    );

    res
}
