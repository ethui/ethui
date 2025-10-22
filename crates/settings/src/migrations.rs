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

use crate::{DarkMode, Settings, onboarding::Onboarding};

// Temporary struct for migration return value
pub type LatestVersion = ConstI64<3>;

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(Serialize))]
#[serde(rename_all = "camelCase", default)]
struct SettingsV0 {
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

#[derive(Debug, Deserialize)]
#[cfg_attr(test, derive(Serialize))]
#[serde(rename_all = "camelCase", default)]
pub struct SettingsV1 {
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

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(Serialize))]
#[serde(rename_all = "camelCase", default)]
pub struct SettingsV2 {
    pub dark_mode: DarkMode,

    pub abi_watch_path: Option<String>,
    pub alchemy_api_key: Option<String>,
    pub etherscan_api_key: Option<String>,
    #[serde(default = "default_true")]
    pub hide_empty_tokens: bool,

    #[serde(default = "default_aliases")]
    aliases: HashMap<Address, String>,

    #[serde(default)]
    fast_mode: bool,

    #[serde(default)]
    autostart: bool,

    #[serde(default)]
    start_minimized: bool,

    #[serde(default)]
    rust_log: String,

    #[serde(default)]
    pub onboarding: Onboarding,

    version: ConstI64<2>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum Versions {
    V0(SettingsV0),
    V1(SettingsV1),
    V2(SettingsV2),
    V3(Settings),
}

pub(crate) async fn load_and_migrate(pathbuf: &PathBuf) -> color_eyre::Result<Settings> {
    let path = Path::new(&pathbuf);
    let file = File::open(path)?;
    let reader = BufReader::new(&file);

    let mut settings: serde_json::Value = serde_json::from_reader(reader)?;

    if settings["version"].is_null() {
        settings["version"] = json!(0);
    }

    let settings: Versions = serde_json::from_value(settings)?;
    let settings = run_migrations(settings);

    Ok(settings)
}

fn run_migrations(settings: Versions) -> Settings {
    let mut result = settings;

    loop {
        if let Versions::V3(v3) = result {
            break v3;
        }

        match result {
            Versions::V0(v0) => {
                result = Versions::V1(SettingsV1 {
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
                result = Versions::V2(SettingsV2 {
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

            Versions::V2(v2) => {
                result = Versions::V3(Settings {
                    version: ConstI64,
                    dark_mode: v2.dark_mode,
                    abi_watch_path: v2.abi_watch_path.map(|s| vec![s]).unwrap_or_default(),
                    alchemy_api_key: v2.alchemy_api_key,
                    etherscan_api_key: v2.etherscan_api_key,
                    hide_empty_tokens: v2.hide_empty_tokens,
                    aliases: v2.aliases,
                    fast_mode: v2.fast_mode,
                    autostart: v2.autostart,
                    start_minimized: v2.start_minimized,
                    rust_log: v2.rust_log,
                    onboarding: v2.onboarding,
                    run_local_stacks: false,
                });
            }

            Versions::V3(v3) => {
                result = Versions::V3(Settings {
                    version: ConstI64,
                    dark_mode: v3.dark_mode,
                    abi_watch_path: v3.abi_watch_path,
                    alchemy_api_key: v3.alchemy_api_key,
                    etherscan_api_key: v3.etherscan_api_key,
                    hide_empty_tokens: v3.hide_empty_tokens,
                    aliases: v3.aliases,
                    fast_mode: v3.fast_mode,
                    autostart: v3.autostart,
                    start_minimized: v3.start_minimized,
                    rust_log: v3.rust_log,
                    onboarding: v3.onboarding,
                    run_local_stacks: v3.run_local_stacks,
                });
            }
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_aliases() -> HashMap<Address, String> {
    Default::default()
}

impl Default for SettingsV0 {
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

impl Default for SettingsV1 {
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

impl Default for SettingsV2 {
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

#[cfg(test)]
mod tests {
    use std::io::Write;

    use tempfile::NamedTempFile;

    use super::{load_and_migrate, *};

    #[tokio::test]
    async fn it_converts_from_v0() {
        let mut tempfile = NamedTempFile::new().unwrap();

        let settings_v0: serde_json::Value = serde_json::to_value(SettingsV0::default()).unwrap();

        write!(tempfile, "{settings_v0}").unwrap();

        if let Ok(settings) = load_and_migrate(&tempfile.path().to_path_buf()).await {
            assert_eq!(settings.version, ConstI64::<3>);
        }
    }

    #[tokio::test]
    async fn abi_watch_path_null() {
        // V2 is the version where abi_watch_path is a Option<String> and not yet a Vec<String>
        let settings = SettingsV2 {
            abi_watch_path: None,
            ..Default::default()
        };

        let str = serde_json::to_string(&settings).unwrap();
        let settings: Settings = serde_json::from_str(&str).unwrap();
        let expected: Vec<String> = vec![];
        assert_eq!(settings.abi_watch_path, expected);
    }

    #[tokio::test]
    async fn abi_watch_path_single() {
        // V2 is the version where abi_watch_path is a Option<String> and not yet a Vec<String>
        let settings = SettingsV2 {
            abi_watch_path: Some("path".into()),
            ..Default::default()
        };

        let str = serde_json::to_string(&settings).unwrap();
        let settings: Settings = serde_json::from_str(&str).unwrap();
        assert_eq!(settings.abi_watch_path, vec!["path".to_string()]);
    }
}
