use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

use crate::AppResult;

pub(crate) fn build(app: &AppHandle) -> AppResult<()> {
    let menu_builder = MenuBuilder::new(app);

    let menu = menu_builder
        .item(&MenuItemBuilder::with_id("show", "Show").build(app)?)
        .item(&MenuItemBuilder::with_id("hide", "Hide").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("quit", "Quit").build(app)?)
        .build()?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(event_handler)
        .build(app)?;

    Ok(())
}

fn event_handler(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "tray/quit" => {
            app.exit(0);
        }
        "tray/hide" => {
            if let Some(w) = app.get_webview_window("main") {
                w.hide().unwrap()
            }
        }
        "tray/show" => {
            tokio::spawn(async { ethui_broadcast::main_window_show().await });
        }
        _ => {}
    }
}
