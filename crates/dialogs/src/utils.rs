use super::{error::Result, global::OPEN_DIALOGS};

pub async fn dialog_close(id: u32) -> Result<()> {
    let dialogs = OPEN_DIALOGS.lock().await;
    let dialog = dialogs.get(&id).unwrap();

    dialog.close().await?;

    Ok(())
}
