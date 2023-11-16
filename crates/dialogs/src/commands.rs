use super::{error::Result, global::OPEN_DIALOGS};

/// Retrieves the payload for a dialog window
/// Dialogs can call this once ready to retrieve the data they're meant to display
#[tauri::command]
pub async fn dialog_get_payload(id: u32) -> Result<serde_json::Value> {
    let dialogs = OPEN_DIALOGS.lock().await;
    let pending = dialogs.get(&id).unwrap();

    Ok(pending.get_payload().await)
}

#[tauri::command]
pub async fn dialog_send(id: u32, payload: serde_json::Value) -> Result<()> {
    let dialogs = OPEN_DIALOGS.lock().await;
    let dialog = dialogs.get(&id).unwrap();

    dialog.incoming(payload).await?;

    Ok(())
}
