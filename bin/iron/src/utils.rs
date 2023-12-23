use iron_settings::Settings;
use iron_types::GlobalState;
use tauri::{AppHandle, Manager};

pub(crate) async fn main_window_show(app: &AppHandle) {
    if let Some(w) = app.get_window("main") {
        w.show().unwrap()
    } else {
        let app = app.clone();
        let onboarded = Settings::read().await.onboarded();
        let url = if onboarded {
            "/home/account"
        } else {
            "/onboarding"
        };

        let builder = tauri::WindowBuilder::new(&app, "main", tauri::WindowUrl::App(url.into()))
            .fullscreen(false)
            .resizable(true)
            .inner_size(600.0, 800.0);

        #[cfg(target_os = "macos")]
        let builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);

        builder.build().unwrap();
    }
}

pub(crate) fn main_window_hide(app: &AppHandle) {
    app.get_window("main").map(|w| w.hide());
}
