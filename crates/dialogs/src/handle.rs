use common::{
    prelude::*,
    ui_events::{DialogClose, DialogOpen, DialogSend},
};
use tokio::sync::mpsc;

use super::{global::OPEN_DIALOGS, presets};

#[derive(Debug, Deserialize, Serialize)]
pub enum DialogMsg {
    Data(Json),
    Close,
}

/// A handle to a dialog
/// The dialog will automatically close on Drop
pub struct Dialog(Arc<RwLock<Inner>>);

/// Structurally the same type as `Dialog`, but without `Drop` logic.
/// This is the version of the Dialog that will be stored in the global map to be used by tauri
pub struct DialogStore(Arc<RwLock<Inner>>);

impl Dialog {
    /// Creates a new dialog handle
    /// The window itself is opened until `open` is called
    pub fn new(preset: &str, payload: Json) -> Dialog {
        Dialog(Arc::new(RwLock::new(Inner::new(preset, payload))))
    }

    /// Opens a dialog
    /// Since this requires acquiring an `AppHandle`, we need to go through the app's event system
    ///
    /// Here, we emits an OpenDialog event, asking the tauri app to do so
    /// The event loop will eventually call back into `open_with_handle` to continue the process
    #[instrument(skip(self), level = "trace")]
    pub async fn open(&self) -> color_eyre::Result<()> {
        let inner = self.0.read().await;
        debug!("Opening dialog {} {}", inner.preset, inner.id);
        OPEN_DIALOGS
            .lock()
            .await
            .insert(inner.id, DialogStore(self.0.clone()));
        inner.open().await
    }

    pub async fn close(self) -> color_eyre::Result<()> {
        Ok(())
    }

    /// Sends an event to the dialog
    pub async fn send(&self, event_type: &str, payload: Option<Json>) -> color_eyre::Result<()> {
        self.0.read().await.send(event_type, payload).await
    }

    /// Awaits data received from the dialog
    pub async fn recv(&self) -> Option<DialogMsg> {
        self.0.read().await.recv().await
    }
}

impl Drop for Dialog {
    fn drop(&mut self) {
        let inner = self.0.clone();
        tokio::spawn(async move {
            let inner = inner.write().await;
            OPEN_DIALOGS.lock().await.remove(&inner.id);
            if let Err(e) = inner.close().await {
                error!("Failed to close dialog {}: {}", inner.id, e);
            }
        });
    }
}

impl DialogStore {
    /// Gets a copy of the payload intended for the dialog
    pub async fn get_payload(&self) -> Json {
        self.0.read().await.payload.clone()
    }

    /// Data received from the dialog
    pub async fn incoming(&self, result: Json) -> color_eyre::Result<()> {
        self.0
            .read()
            .await
            .inbound_snd
            .send(DialogMsg::Data(result))?;
        Ok(())
    }

    pub async fn close(&self) -> color_eyre::Result<()> {
        self.0.read().await.inbound_snd.send(DialogMsg::Close)?;
        Ok(())
    }
}

impl std::fmt::Debug for DialogStore {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Dialog { mutex }").finish()
    }
}

#[derive(Debug)]
pub struct Inner {
    /// window ID
    id: u32,

    /// dialog type
    preset: String,

    /// payload to first send to dialog
    payload: Json,

    /// inbound msgs from dialog
    inbound_snd: mpsc::UnboundedSender<DialogMsg>,

    ///  receiver for inbound msgs behind a RwLock for interior mutability, since we need to be
    ///  able to `recv().await` here while the frontend may also need to write to this Inner object
    ///  to send a result
    inbound_rcv: RwLock<mpsc::UnboundedReceiver<DialogMsg>>,
}

impl Inner {
    fn new(preset: &str, payload: Json) -> Self {
        let (snd, rcv) = mpsc::unbounded_channel();

        Self {
            id: rand::random(),
            preset: preset.to_string(),
            payload,
            inbound_snd: snd,
            inbound_rcv: RwLock::new(rcv),
        }
    }

    async fn open(&self) -> color_eyre::Result<()> {
        let preset = presets::PRESETS
            .get(&self.preset)
            .ok_or_else(|| color_eyre::eyre::eyre!("Unknown dialog preset: {}", self.preset))?;
        let url = format!("index.html#/dialog/{}/{}", self.preset, self.id);
        let title = format!("ethui Dialog - {}", preset.title);

        broadcast::dialog_open(DialogOpen {
            id: self.id,
            label: self.label(),
            title,
            url,
            w: preset.w,
            h: preset.h,
        })
        .await;

        Ok(())
    }

    async fn close(&self) -> color_eyre::Result<()> {
        broadcast::dialog_close(DialogClose {
            label: self.label(),
        })
        .await;

        Ok(())
    }

    async fn send(&self, event_type: &str, payload: Option<Json>) -> color_eyre::Result<()> {
        broadcast::dialog_send(DialogSend {
            label: self.label(),
            event_type: event_type.into(),
            payload,
        })
        .await;

        Ok(())
    }

    async fn recv(&self) -> Option<DialogMsg> {
        self.inbound_rcv.write().await.recv().await
    }

    fn label(&self) -> String {
        format!("dialog/{}", self.id)
    }
}
