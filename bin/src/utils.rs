use ethui_settings::Settings;
use ethui_types::GlobalState;
use tauri::{AppHandle, Manager, WebviewWindowBuilder};

use crate::menu;

pub(crate) async fn main_window_show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        w.show().unwrap()
    } else {
        let onboarded = Settings::read().await.onboarded();
        let url = if onboarded {
            "index.html#/home/account"
        } else {
            "index.html#/onboarding"
        };

        let builder = WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App(url.into()))
            .fullscreen(false)
            .resizable(true)
            .decorations(false)
            .inner_size(600.0, 800.0)
            .on_menu_event(menu::event_handler);

        #[cfg(target_os = "macos")]
        let builder = builder
            .decorations(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay);

        builder.build().unwrap();
    }
}

pub(crate) fn main_window_hide(app: &AppHandle) {
    app.get_webview_window("main").map(|w| w.hide());
}

#[cfg(target_os = "macos")]
pub(crate) async fn all_windows_focus(app: &AppHandle) {
    let windows = app.webview_windows();

    if !windows.is_empty() {
        for window in windows.values() {
            window.set_focus().unwrap();
        }
    }

    main_window_show(app).await;
}
