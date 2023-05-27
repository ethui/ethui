use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};
use tokio::sync::mpsc;
use tokio::sync::{Mutex, MutexGuard};

use super::{global::OPEN_DIALOGS, presets, Result};
use crate::{app, types::Json};

#[derive(Debug)]
pub enum DialogMsg {
    Data(Json),
    Accept(Json),
    Reject(Json),
}

pub type DialogResult = std::result::Result<Json, Json>;

#[derive(Clone)]
pub struct Dialog(Arc<Mutex<Inner>>);

impl Dialog {
    /// Creates a new dialog handle
    /// The window itself is opened until `open` is called
    pub fn new(preset: &str, payload: Json) -> Self {
        Self(Arc::new(Mutex::new(Inner::new(preset, payload))))
    }

    /// Opens a dialog
    /// Since this requires acquiring an `AppHandle`, we need to go through the app's event system
    ///
    /// Here, we emits an OpenDialog event, asking the tauri app to do so
    /// The event loop will eventually call back into `open_with_handle` to continue the process
    pub async fn open(&self) -> Result<()> {
        let id = self.get().await.id;
        OPEN_DIALOGS.lock().await.insert(id, self.clone());
        self.get().await.open(self.clone())
    }

    pub async fn open_with_app_handle(&self, app: &AppHandle) -> Result<()> {
        self.get().await.open_with_handle(app)?;
        Ok(())
    }

    /// Closes the dialog window
    pub async fn close(self) -> Result<()> {
        self.get().await.close(self.clone())
    }

    pub async fn close_with_app_handle(&self, app: &AppHandle) -> Result<()> {
        self.get().await.close_with_handle(app)?;
        Ok(())
    }

    /// Gets a copy of the payload intended for the dialog
    pub async fn get_payload(&self) -> Json {
        self.get().await.payload.clone()
    }

    /// Data received from the dialog
    pub async fn incoming(&self, result: DialogMsg) -> Result<()> {
        self.get().await.inbound.0.send(result)?;
        Ok(())
    }

    /// Awaits data received from the dialog
    pub async fn recv(&self) -> DialogMsg {
        self.get().await.inbound.1.recv().await.unwrap()
    }

    async fn get(&self) -> MutexGuard<'_, Inner> {
        self.0.lock().await
    }
}

impl std::fmt::Debug for Dialog {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Dialog { mutex }").finish()
    }
}

pub struct Inner {
    /// window ID
    id: u32,

    /// dialog type
    preset: String,

    /// payload to first send to dialog
    payload: Json,

    /// app channel
    app_snd: mpsc::UnboundedSender<app::Event>,

    /// inbound msgs from dialog
    inbound: (
        mpsc::UnboundedSender<DialogMsg>,
        mpsc::UnboundedReceiver<DialogMsg>,
    ),
}

impl Inner {
    fn new(preset: &str, payload: Json) -> Self {
        // TODO: make this random as well, or just increment a counter. what if we open the same payload twice?
        let mut s = DefaultHasher::new();
        payload.to_string().hash(&mut s);
        let id: u32 = s.finish() as u32;

        let inbound = mpsc::unbounded_channel();

        Self {
            id,
            preset: preset.to_string(),
            payload,
            app_snd: crate::app::APP_SND.get().unwrap().clone(),
            inbound,
        }
    }

    fn open(&self, handle: Dialog) -> Result<()> {
        Ok(self.app_snd.send(app::Event::OpenDialog(handle))?)
    }

    fn open_with_handle(&self, app: &AppHandle) -> Result<()> {
        let preset = presets::PRESETS.get(&self.preset).unwrap();
        let url = format!("/dialog/{}/{}", self.preset, self.id);
        let title = format!("Iron Dialog - {}", preset.title);
        let label = format!("dialog/{}", self.id);

        WindowBuilder::new(app, label, WindowUrl::App(url.into()))
            .max_inner_size(preset.w, preset.h)
            .title(title)
            .build()?;

        Ok(())
    }

    fn close(&self, handle: Dialog) -> Result<()> {
        self.app_snd.send(app::Event::CloseDialog(handle))?;

        Ok(())
    }

    fn close_with_handle(&self, app: &AppHandle) -> Result<()> {
        Ok(app
            .get_window(&format!("dialog/{}", self.id))
            .unwrap()
            .close()?)
    }
}
