use tauri::{Menu, WindowMenuEvent};

#[cfg(not(target_os = "macos"))]
pub(crate) fn build() -> Menu {
    Default::default()
}

#[cfg(target_os = "macos")]
pub(crate) fn build() -> Menu {
    use tauri::{AboutMetadata, CustomMenuItem, MenuItem, Submenu};

    let app_name = "Iron".to_string();

    let main_menu = Menu::new()
        .add_native_item(MenuItem::About(app_name.clone(), AboutMetadata::default()))
        .add_native_item(MenuItem::Separator)
        .add_item(
            CustomMenuItem::new("settings".to_string(), "Settings...")
                .accelerator("CmdOrCtrl+Comma"),
        )
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Services)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Hide)
        .add_native_item(MenuItem::HideOthers)
        .add_native_item(MenuItem::ShowAll)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Quit);

    let file_menu = Menu::new().add_native_item(MenuItem::CloseWindow);

    let view_menu = Menu::new().add_native_item(MenuItem::EnterFullScreen);

    // edit submenu
    let edit_menu = Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll);

    let go_menu = Menu::new()
        .add_item(CustomMenuItem::new("balances".to_string(), "Balances"))
        .add_item(CustomMenuItem::new(
            "transactions".to_string(),
            "Transactions",
        ))
        .add_item(CustomMenuItem::new("contracts".to_string(), "Contracts"))
        .add_item(CustomMenuItem::new(
            "connections".to_string(),
            "Connections",
        ));

    let menu = Menu::new()
        .add_submenu(Submenu::new(app_name, main_menu))
        .add_submenu(Submenu::new("File", file_menu))
        .add_submenu(Submenu::new("Edit", edit_menu))
        .add_submenu(Submenu::new("View", view_menu))
        .add_submenu(Submenu::new("Go", go_menu));

    // window submenu
    let mut window_menu = Menu::new();
    window_menu = window_menu.add_native_item(MenuItem::Minimize);
    window_menu = window_menu.add_native_item(MenuItem::Zoom);
    window_menu = window_menu.add_native_item(MenuItem::Separator);
    window_menu = window_menu.add_native_item(MenuItem::CloseWindow);
    menu.add_submenu(Submenu::new("Window", window_menu))
}

pub(crate) fn event_handler(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "quit" => {
            std::process::exit(0);
        }
        "close" => {
            event.window().close().unwrap();
        }
        "settings" => {
            event.window().emit("menu:settings", ()).unwrap();
        }
        path => {
            event.window().emit("go", path).unwrap();
        }
    }
}
