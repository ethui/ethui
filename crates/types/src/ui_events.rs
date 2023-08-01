use serde::Serialize;

#[derive(Debug, Clone)]
pub struct DialogOpen {
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
    NetworkChanged,
    TxsUpdated,
    PeersUpdated,
    BalancesUpdated,
}

impl UINotify {
    pub fn label(&self) -> &str {
        match self {
            Self::WalletsChanged => "wallets-changed",
            Self::NetworkChanged => "network-changed",
            Self::TxsUpdated => "txs-updated",
            Self::PeersUpdated => "peers-updated",
            Self::BalancesUpdated => "balances-updated",
        }
    }
}
