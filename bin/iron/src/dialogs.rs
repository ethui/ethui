use iron_types::ui_events;
use tauri::{AppHandle, Manager, WindowBuilder, WindowEvent, WindowUrl};

pub(crate) fn open(handle: &AppHandle, params: ui_events::DialogOpen) {
    let window = WindowBuilder::new(handle, params.label, WindowUrl::App(params.url.into()))
        .inner_size(params.w, params.h)
        .title(params.title)
        .resizable(true)
        .build()
        .unwrap();

    window.on_window_event(on_event);
}

pub(crate) fn close(handle: &AppHandle, params: ui_events::DialogClose) {
    if let Some(window) = handle.get_window(&params.label) {
        window.close().unwrap();
    }
}

pub(crate) fn send(handle: &AppHandle, params: ui_events::DialogSend) {
    if let Some(window) = handle.get_window(&params.label) {
        window.emit(&params.event_type, &params.payload).unwrap();
    }
}

fn on_event(event: &WindowEvent) {
    match event {
        tauri::WindowEvent::CloseRequested { .. } => {
            dbg!("close requested");
        }
        tauri::WindowEvent::Destroyed => {
            dbg!("destroyed");
        }
        _ => {}
    }
}
