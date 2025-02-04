#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error(transparent)]
    DB(#[from] ethui_db::Error),

    #[error(transparent)]
    Forge(#[from] ethui_forge::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    DetectProxyError(#[from] ethui_proxy_detect::error::DetectProxyError),

    #[error(transparent)]
    Network(#[from] ethui_networks::Error),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error(transparent)]
    Tracing(#[from] ethui_tracing::TracingError),

    #[error(transparent)]
    Settings(#[from] ethui_settings::Error),

    #[error("App already running")]
    NamedLock(#[from] named_lock::Error),
}

pub type AppResult<T> = std::result::Result<T, AppError>;

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
