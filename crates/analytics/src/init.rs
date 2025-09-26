use ethui_broadcast::{InternalMsg, UIMsg};
use tauri::{AppHandle, Manager};

use crate::track_event;

pub async fn init(handle: &AppHandle) {
    
    let analytics = crate::Analytics::instance();
    handle.manage(analytics);
    
    
    let handle = handle.clone();
    tauri::async_runtime::spawn(async move {
        receiver(handle).await;
    });
}

async fn receiver(handle: AppHandle) -> ! {
    let mut internal_rx = ethui_broadcast::subscribe_internal().await;
    let mut ui_rx = ethui_broadcast::subscribe_ui().await;

    loop {
        tokio::select! {
            internal_msg = internal_rx.recv() => {
                if let Ok(msg) = internal_msg {
                    use InternalMsg::*;
                    
                    match msg {
                        PeerAdded => {
                            let _ = track_event(&handle, "extension_connected", None);
                        }
                        WalletCreated => {
                            let _ = track_event(&handle, "wallet_created", None);
                        }
                        WalletConnected(wallet_type) => {
                            let mut properties = std::collections::HashMap::new();
                            properties.insert("wallet_type".to_string(), wallet_type.into());
                            let _ = track_event(&handle, "wallet_connected", Some(properties));
                        }
                        TransactionSubmitted(chain_id) => {
                            let mut properties = std::collections::HashMap::new();
                            properties.insert("chain_id".to_string(), chain_id.into());
                            let _ = track_event(&handle, "transaction_submitted", Some(properties));
                        }
                        _ => {}
                    }
                }
            }
            
            ui_msg = ui_rx.recv() => {
                if let Ok(msg) = ui_msg {
                    use UIMsg::*;
                    
                    if let DialogOpen(params) = msg {
                        let mut properties = std::collections::HashMap::new();
                        properties.insert("title".to_string(), params.title.into());
                        let _ = track_event(&handle, "dialog_open", Some(properties));
                    }
                }
            }
        }
    }
}
