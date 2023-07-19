use std::path::PathBuf;

use once_cell::sync::OnceCell;
use serde::Serialize;
use tokio::sync::mpsc;

use crate::dialogs;

#[derive(Debug, Clone)]
pub enum Event {
    /// notify the frontend about a state change
    Notify(Notify),

    /// open a dialog
    DialogOpen(dialogs::DialogOpenParams),

    /// close a dialog
    DialogClose(dialogs::DialogCloseParams),

    /// sends a new event to a dialog
    DialogSend(dialogs::DialogSend),
}

#[derive(Debug, Serialize, Clone)]
pub enum Notify {
    #[allow(unused)]
    WalletsChanged,
    NetworkChanged,
    TxsUpdated,
    PeersUpdated,
    BalancesUpdated,
}

impl Notify {
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

impl From<Notify> for Event {
    fn from(value: Notify) -> Self {
        Event::Notify(value)
    }
}

pub static SETTINGS_PATH: OnceCell<PathBuf> = OnceCell::new();

/// a global sender used internally to go through the app's event loop, which is required for
/// opening dialogs
pub static APP_SND: OnceCell<mpsc::UnboundedSender<Event>> = OnceCell::new();

#[cfg(not(target_os = "linux"))]
fn on_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "quit" => {
            std::process::exit(0);
        }
        "close" => {
            event.window().close().unwrap();
        }
        path => {
            event.window().emit("go", path).unwrap();
        }
    }
}
