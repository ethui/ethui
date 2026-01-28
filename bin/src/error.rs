use alloy::transports::{RpcError, TransportErrorKind};

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error(transparent)]
    DB(#[from] ethui_db::Error),

    #[error(transparent)]
    SolArtifacts(#[from] ethui_sol_artifacts::Error),

    #[cfg(feature = "stacks")]
    #[error(transparent)]
    Stacks(#[from] ethui_stacks::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    DetectProxyError(#[from] ethui_proxy_detect::error::DetectProxyError),

    #[error(transparent)]
    Network(#[from] ethui_networks::Error),

    #[error("Invalid Network {0}")]
    InvalidNetwork(u32),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error(transparent)]
    Tracing(#[from] ethui_tracing::TracingError),

    #[error(transparent)]
    Settings(#[from] ethui_settings::Error),

    #[error("App already running")]
    NamedLock(#[from] named_lock::Error),

    #[error(transparent)]
    Rpc(#[from] RpcError<TransportErrorKind>),
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
