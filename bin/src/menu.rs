use tauri::{menu::MenuEvent, AppHandle, Emitter as _, Manager, Window};

use crate::AppResult;

// #[cfg(not(target_os = "macos"))]
// pub(crate) fn build(_app: &AppHandle) -> AppResult<()> {
//     Ok(())
// }
//
// #[cfg(target_os = "macos")]
pub(crate) fn build(app: &AppHandle) -> AppResult<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    let settings = MenuItemBuilder::with_id("settings", "Settings")
        .accelerator("CmdOrCtrl+Comma")
        .build(app)?;

    let main_menu = SubmenuBuilder::new(app, "ethui")
        .about(None)
        .separator()
        .item(&settings)
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File").close_window().build()?;

    let view_menu = SubmenuBuilder::new(app, "View").fullscreen().build()?;

    // edit submenu
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let go_menu = SubmenuBuilder::new(app, "Go")
        .item(&MenuItemBuilder::with_id("/home/account", "Account").build(app)?)
        .item(&MenuItemBuilder::with_id("/home/transactions", "Transactions").build(app)?)
        .item(&MenuItemBuilder::with_id("/home/contracts", "Contracts").build(app)?)
        .item(&MenuItemBuilder::with_id("/home/connections", "Connections").build(app)?)
        .build()?;

    // window submenu
    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    MenuBuilder::new(app)
        .item(&main_menu)
        .item(&file_menu)
        .item(&view_menu)
        .item(&edit_menu)
        .item(&go_menu)
        .item(&window_menu)
        .build()?;

    Ok(())
}

pub(crate) fn event_handler(window: &Window, event: MenuEvent) {
    match event.id().as_ref() {
        "quit" => {
            window.app_handle().exit(0);
        }
        "close" => {
            window.close().unwrap();
        }
        "settings" => {
            window.emit("menu:settings", ()).unwrap();
        }
        path => {
            window.emit("go", path).unwrap();
        }
    }
}
