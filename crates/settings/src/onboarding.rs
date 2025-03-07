use ethui_broadcast::InternalMsg;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Onboarding {
    pub(crate) hidden: bool,
    pub(crate) alchemy: bool,
    pub(crate) wallet: bool,
    pub(crate) extension: bool,
}

impl Onboarding {
    pub(crate) fn all_done() -> Self {
        Self {
            hidden: true,
            alchemy: true,
            wallet: true,
            extension: true,
        }
    }

    pub(crate) fn hide(&mut self) {
        self.hidden = true;
    }

    pub(crate) fn update(&mut self, msg: InternalMsg) -> Self {
        match msg {
            InternalMsg::SettingsUpdated => Self::default(),
            _ => Self::default(),
        }
    }
}
