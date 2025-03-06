use tauri::{AppHandle, Manager};

use super::build_window;

pub(crate) fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        w.show().unwrap()
    } else {
        let url = "index.html#/home/account";
        build_window(app, "main", url, 600.0, 800.0);
    }
}

pub(crate) fn hide(app: &AppHandle) {
    app.get_webview_window("main").map(|w| w.hide());
}
