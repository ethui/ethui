use ethui_settings::actor::{get_actor, GetSettings};
use tauri::{AppHandle, Manager};

use super::build_window;

pub(crate) async fn show(app: &AppHandle) {
    let actor = get_actor().await.expect("Settings actor not available");
    let settings = actor.ask(GetSettings).await.expect("Failed to get settings");

    if let Some(w) = app.get_webview_window("main") {
        w.show().unwrap()
    } else {
        let url = if settings.onboarding.is_all_finished() {
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
