use tauri::{AppHandle, Manager, SystemTrayEvent};

pub(crate) fn build() -> tauri::SystemTray {
    use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem};

    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let show = CustomMenuItem::new("show".to_string(), "Show");
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
            "show" => show_main_window(app),
            _ => {}
        },
        DoubleClick { .. } => show_main_window(app),
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(w) = app.get_window("main") {
        w.show().unwrap()
    } else {
        tauri::WindowBuilder::new(app, "main", tauri::WindowUrl::App("index.html".into()))
            .build()
            .unwrap();
    }
}
