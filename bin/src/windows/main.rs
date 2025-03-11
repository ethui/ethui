use ethui_settings::Settings;
use ethui_types::GlobalState as _;
use tauri::{AppHandle, Manager};

use super::build_window;

pub(crate) async fn show(app: &AppHandle) {
    let settings = Settings::read().await;

    if let Some(w) = app.get_webview_window("main") {
        w.show().unwrap()
    } else {
        let url = if settings.inner.onboarding.is_all_done() {
            "index.html#/home/account"
        } else {
            "index.html#/home/onboarding"
        };

        build_window(app, "main", url, 600.0, 800.0);
    }
}

pub(crate) fn hide(app: &AppHandle) {
    app.get_webview_window("main").map(|w| w.hide());
}
