pub mod commands;
mod error;
mod global;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

pub use self::error::{Error, Result};
use crate::types::ChecksummedAddress;

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

    pub fn get(&self) -> &SerializedSettings {
        &self.inner
    }

    fn get_alias(&self, address: ChecksummedAddress) -> Option<String> {
        self.inner.aliases.get(&address).cloned()
    }

    fn set_alias(&mut self, address: ChecksummedAddress, alias: Option<String>) {
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

    #[serde(default)]
    aliases: HashMap<ChecksummedAddress, String>,
}

impl Default for SerializedSettings {
    fn default() -> Self {
        Self {
            dark_mode: DarkMode::Auto,
            abi_watch: false,
            abi_watch_path: None,
            aliases: HashMap::new(),
        }
    }
}
