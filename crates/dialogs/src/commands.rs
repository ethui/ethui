use super::{error::Result, global::OPEN_DIALOGS, handle::DialogMsg};

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

    let msg = DialogMsg::Data(payload);
    dialog.incoming(msg).await?;

    Ok(())
}

/// Receives the return value of a dialog, and closes it
/// The dialog must return a Result<serde_json::Value>, indicating whether the result is a success
/// or failure (e.g.: was the transaction approved or rejected?)
///
/// Since feature-gating doesn't play well inside the `generate_handler!` macro where this is
/// called, we need to feature-gate inside the body
#[tauri::command]
pub async fn dialog_finish(
    dialog: tauri::Window,
    id: u32,
    result: super::handle::DialogResult,
) -> Result<()> {
    dialog.close()?;

    let mut dialogs = OPEN_DIALOGS.lock().await;
    let dialog = dialogs.remove(&id).unwrap();

    let msg = match result {
        Ok(json) => DialogMsg::Accept(json),
        Err(json) => DialogMsg::Reject(json),
    };
    dialog.incoming(msg).await.unwrap();

    Ok(())
}
