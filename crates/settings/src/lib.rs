pub mod actor;
mod autostart;
pub mod commands;
mod init;
mod migrations;
mod onboarding;
mod utils;

pub use actor::*;
use ethui_types::prelude::*;
pub use init::init;
use migrations::LatestVersion;
use onboarding::Onboarding;
use serde_constant::ConstI64;
pub use utils::test_alchemy_api_key;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DarkMode {
    Auto,
    Dark,
    Light,
}

#[derive(Debug, Clone, Serialize, Deserialize, kameo::Reply)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub dark_mode: DarkMode,

    #[serde(deserialize_with = "ethui_types::de::optional_string_or_array")]
    pub abi_watch_path: Vec<String>,

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
    pub run_local_stacks: bool,

    #[serde(default)]
    pub onboarding: Onboarding,

    version: LatestVersion,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            dark_mode: DarkMode::Auto,
            abi_watch_path: vec![],
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
            run_local_stacks: false,
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_aliases() -> HashMap<Address, String> {
    Default::default()
}
