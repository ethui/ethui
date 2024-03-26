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
            .inner_size(600.0, 800.0)
            .on_menu_event(menu::event_handler);

        #[cfg(target_os = "macos")]
        let builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);

        builder.build().unwrap();
    }
}

pub(crate) fn main_window_hide(app: &AppHandle) {
    app.get_webview_window("main").map(|w| w.hide());
}
