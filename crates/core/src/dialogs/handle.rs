use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

use iron_types::app_events::{DialogClose, DialogOpen, DialogSend};
use iron_types::{AppEvent, Json};
use tokio::sync::{mpsc, RwLock, RwLockReadGuard};

use super::{global::OPEN_DIALOGS, presets, Result};

#[derive(Debug)]
pub enum DialogMsg {
    Data(Json),
    Accept(Json),
    Reject(Json),
}

pub type DialogResult = std::result::Result<Json, Json>;

#[derive(Clone)]
pub struct Dialog(Arc<RwLock<Inner>>);

impl Dialog {
    /// Creates a new dialog handle
    /// The window itself is opened until `open` is called
    pub fn new(preset: &str, payload: Json) -> Self {
        Self(Arc::new(RwLock::new(Inner::new(preset, payload))))
    }

    /// Opens a dialog
    /// Since this requires acquiring an `AppHandle`, we need to go through the app's event system
    ///
    /// Here, we emits an OpenDialog event, asking the tauri app to do so
    /// The event loop will eventually call back into `open_with_handle` to continue the process
    pub async fn open(&self) -> Result<()> {
        let clone = self.clone();
        let inner = self.read().await;
        OPEN_DIALOGS.lock().await.insert(inner.id, clone);
        inner.open()
    }

    /// Closes the dialog window
    pub async fn close(self) -> Result<()> {
        self.read().await.close()
    }

    /// Gets a copy of the payload intended for the dialog
    pub async fn get_payload(&self) -> Json {
        self.read().await.payload.clone()
    }

    /// Data received from the dialog
    pub async fn incoming(&self, result: DialogMsg) -> Result<()> {
        self.read().await.inbound_snd.send(result)?;
        Ok(())
    }

    /// Sends an event to the dialog
    pub async fn send(&self, event_type: &str, payload: Option<Json>) -> Result<()> {
        self.read().await.send(event_type, payload)
    }

    /// Awaits data received from the dialog
    pub async fn recv(&self) -> Option<DialogMsg> {
        self.read().await.recv().await
    }

    async fn read(&self) -> RwLockReadGuard<'_, Inner> {
        self.0.read().await
    }
}

impl std::fmt::Debug for Dialog {
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

    /// app channel
    app_snd: mpsc::UnboundedSender<AppEvent>,

    /// inbound msgs from dialog
    inbound_snd: mpsc::UnboundedSender<DialogMsg>,

    ///  receiver for inbound msgs behind a RwLock for interior mutability, since we need to be
    ///  able to `recv().await` here while the frontend may also need to write to this Inner object
    ///  to send a result
    inbound_rcv: RwLock<mpsc::UnboundedReceiver<DialogMsg>>,
}

impl Inner {
    fn new(preset: &str, payload: Json) -> Self {
        // TODO: make this random as well, or just increment a counter. what if we open the same payload twice?
        let mut s = DefaultHasher::new();
        payload.to_string().hash(&mut s);
        let id: u32 = s.finish() as u32;

        let (snd, rcv) = mpsc::unbounded_channel();

        Self {
            id,
            preset: preset.to_string(),
            payload,
            app_snd: crate::app::APP_SND.get().unwrap().clone(),
            inbound_snd: snd,
            inbound_rcv: RwLock::new(rcv),
        }
    }

    fn open(&self) -> Result<()> {
        let preset = presets::PRESETS.get(&self.preset).unwrap();
        let url = format!("/dialog/{}/{}", self.preset, self.id);
        let title = format!("Iron Dialog - {}", preset.title);

        Ok(self.app_snd.send(AppEvent::DialogOpen(DialogOpen {
            label: self.label(),
            title,
            url,
            w: preset.w,
            h: preset.h,
        }))?)
    }

    fn close(&self) -> Result<()> {
        self.app_snd.send(AppEvent::DialogClose(DialogClose {
            label: self.label(),
        }))?;

        Ok(())
    }

    fn send(&self, event_type: &str, payload: Option<Json>) -> Result<()> {
        self.app_snd.send(AppEvent::DialogSend(DialogSend {
            label: self.label(),
            event_type: event_type.into(),
            payload,
        }))?;
        Ok(())
    }

    async fn recv(&self) -> Option<DialogMsg> {
        self.inbound_rcv.write().await.recv().await
    }

    fn label(&self) -> String {
        format!("dialog/{}", self.id)
    }
}
