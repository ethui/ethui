use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{ClickType, TrayIconBuilder},
    AppHandle, Manager,
};

use crate::AppResult;

pub(crate) fn build(app: &AppHandle) -> AppResult<()> {
    let menu_builder = MenuBuilder::new(app);

    #[cfg(feature = "debug")]
    let menu_builder = menu_builder
        .item(&MenuItemBuilder::with_id("dev_mode", "Dev Mode").build(app)?)
        .separator();

    let menu = menu_builder
        .item(&MenuItemBuilder::with_id("show", "Show").build(app)?)
        .item(&MenuItemBuilder::with_id("hide", "Hide").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("quit", "Quit").build(app)?)
        .build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(event_handler)
        .on_tray_icon_event(|tray, event| {
            if event.click_type == ClickType::Left {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub(crate) fn event_handler(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "quit" => app.exit(0),
        "hide" => app.get_webview_window("main").unwrap().hide().unwrap(),
        "show" => {
            tokio::spawn(async { ethui_broadcast::main_window_show().await });
        }
        _ => {}
    }
}
