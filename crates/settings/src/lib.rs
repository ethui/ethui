pub mod commands;
mod error;
mod init;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
    str::FromStr,
};

use ethers::core::types::Address;
pub use init::init;
use iron_types::ChecksummedAddress;
use serde::{Deserialize, Serialize};

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
    /// Changes the currently connected wallet
    ///
    /// Broadcasts `accountsChanged`
    pub fn set(&mut self, new_settings: SerializedSettings) -> Result<()> {
        self.inner = new_settings;
        self.save()?;

        Ok(())
    }

    pub fn set_dark_mode(&mut self, mode: DarkMode) -> Result<()> {
        self.inner.dark_mode = mode;
        self.save()?;

        Ok(())
    }

    pub fn finish_onboarding(&mut self) -> Result<()> {
        self.inner.onboarded = true;
        self.save()?;

        Ok(())
    }

    pub fn get(&self) -> &SerializedSettings {
        &self.inner
    }

    fn get_alias(&self, address: ChecksummedAddress) -> Option<String> {
        self.inner.aliases.get(&address).cloned()
    }

    fn set_alias(&mut self, address: ChecksummedAddress, alias: Option<String>) {
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
    fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, &self.inner)?;

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedSettings {
    pub dark_mode: DarkMode,

    pub abi_watch: bool,
    pub abi_watch_path: Option<String>,
    pub alchemy_api_key: Option<String>,
    #[serde(default = "default_true")]
    pub hide_empty_tokens: bool,

    #[serde(default = "default_aliases")]
    aliases: HashMap<ChecksummedAddress, String>,

    #[serde(default)]
    onboarded: bool,
}

impl Default for SerializedSettings {
    fn default() -> Self {
        Self {
            dark_mode: DarkMode::Auto,
            abi_watch: false,
            abi_watch_path: None,
            alchemy_api_key: None,
            hide_empty_tokens: true,
            aliases: HashMap::new(),
            onboarded: false,
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_aliases() -> HashMap<ChecksummedAddress, String> {
    let mut res = HashMap::new();
    res.insert(
        Address::from_str("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
            .unwrap()
            .into(),
        "alice".into(),
    );
    res.insert(
        Address::from_str("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
            .unwrap()
            .into(),
        "bob".into(),
    );
    res.insert(
        Address::from_str("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
            .unwrap()
            .into(),
        "charlie".into(),
    );

    res
}
