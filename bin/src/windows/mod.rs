pub mod dialogs;
pub mod main;

use tauri::{AppHandle, Manager as _, WebviewWindowBuilder};

use crate::menu;

/// Builds a generic webview window
pub fn build_window(
    app: &AppHandle,
    label: &str,
    url: &str,
    w: f64,
    h: f64,
) -> tauri::WebviewWindow {
    let builder = WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App(url.into()))
        .fullscreen(false)
        .resizable(true)
        .decorations(false)
        .inner_size(w, h)
        .on_menu_event(menu::event_handler);

    #[cfg(not(target_os = "macos"))]
    let builder = builder.title(window_title(label));

    #[cfg(target_os = "macos")]
    let builder = builder
        .title("")
        .decorations(true)
        .min_inner_size(500.0, 375.0)
        .title_bar_style(tauri::TitleBarStyle::Overlay);

    let window = builder.build().unwrap();
    window.show().unwrap();
    window.set_focus().unwrap();

    window
}

/// Focuses all exiting windows, opening main window in the process if it doesn't exist
/// Useful for macOS's dock icon click
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) async fn all_windows_focus(app: &AppHandle) {
    let windows = app.webview_windows();

    if !windows.is_empty() {
        for window in windows.values() {
            window.set_focus().unwrap();
        }
    }

    main::show(app).await;
}

#[allow(dead_code)]
fn window_title(name: &str) -> String {
    #[cfg(debug_assertions)]
    {
        format!("ethui-dev - {name}")
    }

    #[cfg(not(debug_assertions))]
    {
        format!("ethui - {name}")
    }
}
