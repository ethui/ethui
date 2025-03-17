use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use ethui_types::Address;
use serde::Deserialize;
#[cfg(test)]
use serde::Serialize;
use serde_constant::ConstI64;
use serde_json::json;

use crate::{onboarding::Onboarding, DarkMode, Result, SerializedSettings, Settings};

pub type LatestVersion = ConstI64<2>;

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(Serialize))]
#[serde(rename_all = "camelCase", default)]
struct SerializedSettingsV0 {
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
    fast_mode: bool,

    #[serde(default)]
    autostart: bool,

    #[serde(default)]
    start_minimized: bool,

    #[serde(default)]
    rust_log: String,

    version: ConstI64<0>,
}

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(Serialize))]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedSettingsV1 {
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
    fast_mode: bool,

    #[serde(default)]
    autostart: bool,

    #[serde(default)]
    start_minimized: bool,

    #[serde(default)]
    rust_log: String,

    version: ConstI64<1>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum Versions {
    V0(SerializedSettingsV0),
    V1(SerializedSettingsV1),
    V2(SerializedSettings),
}

pub(crate) async fn load_and_migrate(pathbuf: &PathBuf) -> Result<Settings> {
    let path = Path::new(&pathbuf);
    let file = File::open(path)?;
    let reader = BufReader::new(&file);

    let mut settings: serde_json::Value = serde_json::from_reader(reader)?;

    if settings["version"].is_null() {
        settings["version"] = json!(0);
    }

    let settings: Versions = serde_json::from_value(settings)?;

    let settings = Settings {
        inner: run_migrations(settings),
        file: path.to_path_buf(),
    };

    settings.save().await?;

    Ok(settings)
}

fn run_migrations(settings: Versions) -> SerializedSettings {
    let mut result = settings;

    loop {
        if let Versions::V2(v2) = result {
            break v2;
        }

        match result {
            Versions::V0(v0) => {
                result = Versions::V1(SerializedSettingsV1 {
                    version: ConstI64,
                    dark_mode: v0.dark_mode,
                    abi_watch_path: v0.abi_watch_path,
                    alchemy_api_key: v0.alchemy_api_key,
                    etherscan_api_key: v0.etherscan_api_key,
                    hide_empty_tokens: v0.hide_empty_tokens,
                    aliases: v0.aliases,
                    onboarded: v0.onboarded,
                    fast_mode: v0.fast_mode,
                    autostart: v0.autostart,
                    start_minimized: v0.start_minimized,
                    rust_log: v0.rust_log,
                });
            }

            Versions::V1(v1) => {
                result = Versions::V2(SerializedSettings {
                    version: ConstI64,
                    dark_mode: v1.dark_mode,
                    abi_watch_path: v1.abi_watch_path,
                    alchemy_api_key: v1.alchemy_api_key,
                    etherscan_api_key: v1.etherscan_api_key,
                    hide_empty_tokens: v1.hide_empty_tokens,
                    aliases: v1.aliases,
                    fast_mode: v1.fast_mode,
                    autostart: v1.autostart,
                    start_minimized: v1.start_minimized,
                    rust_log: v1.rust_log,
                    onboarding: if v1.onboarded {
                        Onboarding::all_done()
                    } else {
                        Onboarding::default()
                    },
                });
            }

            Versions::V2(v2) => return v2,
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_aliases() -> HashMap<Address, String> {
    Default::default()
}

impl Default for SerializedSettingsV0 {
    fn default() -> Self {
        Self {
            dark_mode: DarkMode::Auto,
            abi_watch_path: None,
            alchemy_api_key: None,
            etherscan_api_key: None,
            hide_empty_tokens: true,
            aliases: HashMap::new(),
            onboarded: false,
            fast_mode: false,
            autostart: false,
            start_minimized: false,
            rust_log: "warn".into(),
            version: ConstI64,
        }
    }
}

impl Default for SerializedSettingsV1 {
    fn default() -> Self {
        Self {
            dark_mode: DarkMode::Auto,
            abi_watch_path: None,
            alchemy_api_key: None,
            etherscan_api_key: None,
            hide_empty_tokens: true,
            aliases: HashMap::new(),
            onboarded: false,
            fast_mode: false,
            autostart: false,
            start_minimized: false,
            rust_log: "warn".into(),
            version: ConstI64,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{
        fs::File,
        io::{BufReader, Write},
    };

    use tempfile::NamedTempFile;

    use super::{load_and_migrate, *};

    #[tokio::test]
    async fn it_converts_from_v0_to_v1() {
        let mut tempfile = NamedTempFile::new().unwrap();

        let settings_v0: serde_json::Value =
            serde_json::to_value(SerializedSettingsV0::default()).unwrap();

        write!(tempfile, "{}", settings_v0).unwrap();

        if let Ok(_settings) = load_and_migrate(&tempfile.path().to_path_buf()).await {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_networks: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_networks["version"], 1);
        }
    }
}
