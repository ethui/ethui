use super::Settings;
use crate::commands::Ctx;

#[tauri::command]
pub async fn foundry_get_settings(ctx: Ctx<'_>) -> Result<super::Settings, ()> {
    let ctx = ctx.lock().await;

    Ok(ctx.foundry.clone())
}

#[tauri::command]
pub async fn foundry_set_settings(ctx: Ctx<'_>, new_settings: Settings) -> Result<(), ()> {
    let mut ctx = ctx.lock().await;
    ctx.foundry = new_settings;

    // TODO: better error handling here
    ctx.save().map_err(|_| ())?;
    Ok(())
}
