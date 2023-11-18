use tauri::{AppHandle, Manager};

pub(crate) fn main_window_show(app: &AppHandle) {
    if let Some(w) = app.get_window("main") {
        w.show().unwrap()
    } else {
        tauri::WindowBuilder::new(app, "main", tauri::WindowUrl::App("index.html".into()))
            .build()
            .unwrap();
    }
}

pub(crate) fn main_window_hide(app: &AppHandle) {
    app.get_window("main").map(|w| w.hide());
}
