use ethui_types::ui_events;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub(crate) fn open(handle: &AppHandle, params: ui_events::DialogOpen) {
    let window =
        WebviewWindowBuilder::new(handle, params.label, WebviewUrl::App(params.url.into()))
            .inner_size(params.w, params.h)
            .title(params.title)
            .resizable(true)
            .build()
            .unwrap();

    window.on_window_event(move |event| on_event(params.id, event));
}

pub(crate) fn close(handle: &AppHandle, params: ui_events::DialogClose) {
    if let Some(window) = handle.get_webview_window(&params.label) {
        window.close().unwrap();
    }
}

pub(crate) fn send(handle: &AppHandle, params: ui_events::DialogSend) {
    if let Some(window) = handle.get_webview_window(&params.label) {
        window.emit(&params.event_type, &params.payload).unwrap();
    }
}

fn on_event(window_id: u32, event: &WindowEvent) {
    use tauri::WindowEvent as E;

    match &event {
        E::CloseRequested { .. } | E::Destroyed => {
            tokio::spawn(async move {
                ethui_dialogs::dialog_close(window_id)
                    .await
                    .unwrap_or_else(|_e| {
                        tracing::warn!("failed to close dialog: {}", window_id);
                    });
            });
        }
        _ => {}
    }
}
