use super::global::OPEN_DIALOGS;

pub async fn dialog_close(id: u32) -> color_eyre::Result<()> {
    let dialogs = OPEN_DIALOGS.lock().await;

    if let Some(dialog) = dialogs.get(&id) {
        dialog.close().await?;
    }

    Ok(())
}
