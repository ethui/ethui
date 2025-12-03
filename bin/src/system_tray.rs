use tauri::{
    AppHandle, Manager,
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::TrayIconBuilder,
};

pub(crate) fn build(app: &AppHandle) -> color_eyre::Result<()> {
    let menu_builder = MenuBuilder::new(app);

    let menu = menu_builder
        .item(&MenuItemBuilder::with_id("tray/show", "Show").build(app)?)
        .item(&MenuItemBuilder::with_id("tray/hide", "Hide").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("tray/quit", "Quit").build(app)?)
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
            tokio::spawn(async { broadcast::main_window_show().await });
        }
        _ => {}
    }
}
