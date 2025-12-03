use color_eyre::eyre::ContextCompat as _;
use common::TauriResult;

use super::global::OPEN_DIALOGS;

/// Retrieves the payload for a dialog window
/// Dialogs can call this once ready to retrieve the data they're meant to display
#[tauri::command]
pub async fn dialog_get_payload(id: u32) -> TauriResult<serde_json::Value> {
    let dialogs = OPEN_DIALOGS.lock().await;
    let pending = dialogs
        .get(&id)
        .wrap_err_with(|| format!("Dialog not found {id}"))?;

    Ok(pending.get_payload().await)
}

#[tauri::command]
pub async fn dialog_send(id: u32, payload: serde_json::Value) -> TauriResult<()> {
    let dialogs = OPEN_DIALOGS.lock().await;
    let dialog = dialogs
        .get(&id)
        .with_context(|| format!("Dialog not found {id}"))?;

    dialog.incoming(payload).await?;

    Ok(())
}
