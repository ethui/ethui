use tauri::{AppHandle, Manager, SystemTrayEvent};

pub(crate) fn build() -> tauri::SystemTray {
    use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem};

    let quit = CustomMenuItem::new("quit".to_string(), "Quit Iron Wallet").accelerator("Cmd+Q");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let show =
        CustomMenuItem::new("show".to_string(), "Show Iron Wallet").accelerator("Ctrl+Cmd+W");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

pub(crate) fn event_handler(app: &AppHandle, event: SystemTrayEvent) {
    use SystemTrayEvent::*;

    match event {
        MenuItemClick { id, .. } => match id.as_str() {
            "quit" => app.exit(0),
            "hide" => app.get_window("main").unwrap().hide().unwrap(),
            "show" => {
                tokio::spawn(async { iron_broadcast::main_window_show().await });
            }
            _ => {}
        },
        DoubleClick { .. } => {
            tokio::spawn(async { iron_broadcast::main_window_show().await });
        }

        _ => {}
    }
}
