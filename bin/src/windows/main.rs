use ethui_settings::Settings;
use ethui_types::GlobalState;
use tauri::{AppHandle, Manager};

use super::build_window;

pub(crate) async fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        w.show().unwrap()
    } else {
        let onboarded = Settings::read().await.onboarded();
        let url = if onboarded {
            "index.html#/home/account"
        } else {
            "index.html#/onboarding"
        };

        build_window(app, "main", url, 600.0, 800.0);
    }
}

pub(crate) fn hide(app: &AppHandle) {
    app.get_webview_window("main").map(|w| w.hide());
}
