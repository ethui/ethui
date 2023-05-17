use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};
use std::sync::Mutex;

use once_cell::sync::{Lazy, OnceCell};
use tauri::{AppHandle, WindowBuilder, WindowUrl};
use tokio::sync::{mpsc, oneshot};

use crate::app::IronEvent;

pub type Json = serde_json::Value;
pub type DialogResult = std::result::Result<Json, Json>;
pub type DialogReceiver = oneshot::Receiver<DialogResult>;

#[derive(Debug)]
struct PendingDialog {
    oneshot_snd: oneshot::Sender<DialogResult>,
}

type PendingDialogMap = HashMap<u64, PendingDialog>;

static DIALOGS: Lazy<Mutex<PendingDialogMap>> = Lazy::new(Default::default);

/// a global sender used internally to go through the app's event loop, which is required for
/// opening dialogs
static APP_SND: OnceCell<mpsc::UnboundedSender<IronEvent>> = OnceCell::new();

pub fn init(app_snd: mpsc::UnboundedSender<IronEvent>) {
    APP_SND.set(app_snd).unwrap();
}

/// The main entrypoint to opening a dialog
/// Since this requires acquiring an `AppHandle`, we need to go through the app's event system
///
/// This function creates the necessary oneshot channel for later receiving the response
/// And emits an OpenDialog event, asking the window to do so
///
/// The event loop will eventually call back into `open_with_handle` to continue the process
pub fn open(dialog_type: &str, payload: Json) -> crate::Result<DialogReceiver> {
    // TODO: make this random as well, or just increment a counter. what if we open the same payload twice?
    let mut s = DefaultHasher::new();
    payload.to_string().hash(&mut s);
    let id: u64 = s.finish();

    let (snd, rcv) = oneshot::channel();

    APP_SND
        .get()
        .unwrap()
        .send(IronEvent::OpenDialog(id, dialog_type.to_string(), payload))?;

    DIALOGS
        .lock()
        .unwrap()
        .insert(id, PendingDialog { oneshot_snd: snd });

    Ok(rcv)
}

/// Opens a dialog window after acquiring an `AppHandle`
/// This window receives:
///   - dialog_type: a string indicating the UI which type of dialog it should render
///   - id: a numeric ID, meant to match the future window response with the pending oneshot
///   channel
///   - payload: a JSON payload to display information. The schema depends on the type of dialog
#[allow(unused)]
pub fn open_with_handle(
    app: &AppHandle,
    dialog_type: String,
    id: u64,
    payload: Json,
) -> crate::Result<()> {
    let url = format!(
        "dialog.html?type={}&id={}&payload={}",
        dialog_type,
        id,
        urlencoding::encode(&payload.to_string())
    );

    let window = WindowBuilder::new(app, "dialog", WindowUrl::App(url.into()))
        .inner_size(500f64, 600f64)
        .build()?;

    Ok(())
}

/// Receives the return value of a dialog, and closes it
/// The dialog must return a Result<serde_json::Value>, indicating whether the result is a success
/// or failure (e.g.: was the transaction approved or rejected?)
///
/// Since feature-gating doesn't play well inside the `generate_handler!` macro where this is
/// called, we need to feature-gate inside the body
#[tauri::command]
pub fn dialog_finish(id: u64, dialog: tauri::Window, result: DialogResult) -> Result<(), String> {
    dialog.close().map_err(|e| e.to_string())?;

    let pending = DIALOGS.lock().unwrap().remove(&id).unwrap();
    pending.oneshot_snd.send(result).unwrap();

    Ok(())
}
