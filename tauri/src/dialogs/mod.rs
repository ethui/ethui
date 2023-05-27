pub mod commands;
mod error;
mod global;
mod handle;
mod presets;

pub use error::{Error, Result};
pub use handle::{Dialog, DialogMsg};

use crate::types::Json;

#[derive(Debug, Clone)]
pub struct DialogOpenParams {
    pub label: String,
    pub title: String,
    pub url: String,
    pub w: f64,
    pub h: f64,
}

#[derive(Debug, Clone)]
pub struct DialogCloseParams {
    pub label: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DialogSend {
    pub label: String,
    pub event_type: String,
    pub payload: Option<Json>,
}
