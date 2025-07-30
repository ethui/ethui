use serde::Serialize;

#[derive(Debug, Clone)]
pub struct DialogOpen {
    pub id: u32,
    pub label: String,
    pub title: String,
    pub url: String,
    pub w: f64,
    pub h: f64,
}

#[derive(Debug, Clone)]
pub struct DialogClose {
    pub label: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DialogSend {
    pub label: String,
    pub event_type: String,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Clone)]
pub enum UINotify {
    #[allow(unused)]
    WalletsChanged,
    NetworksChanged,
    CurrentNetworkChanged,
    TxsUpdated,
    PeersUpdated,
    BalancesUpdated,
    ContractsUpdated,
    SettingsChanged,
    UpdateReady {
        version: String,
    },
}

impl UINotify {
    pub fn label(&self) -> &str {
        match self {
            Self::WalletsChanged => "wallets-changed",
            Self::NetworksChanged => "networks-changed",
            Self::CurrentNetworkChanged => "current-network-changed",
            Self::TxsUpdated => "txs-updated",
            Self::PeersUpdated => "peers-updated",
            Self::BalancesUpdated => "balances-updated",
            Self::ContractsUpdated => "contracts-updated",
            Self::SettingsChanged => "settings-changed",
            Self::UpdateReady { .. } => "update-ready",
        }
    }
}
