use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Forge(#[from] ethui_forge::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    Connection(#[from] ethui_connections::Error),

    #[error(transparent)]
    Network(#[from] ethui_networks::Error),

    #[error(transparent)]
    RPC(#[from] ethui_rpc::Error),

    #[error(transparent)]
    Settings(#[from] ethui_settings::Error),

    // #[error(transparent)]
    // Simulation(#[from] ethui_simulator::errors::SimulationError),
    #[error(transparent)]
    Wallets(#[from] ethui_wallets::Error),

    #[error("invalid chain id: {0}")]
    InvalidChainId(u32),

    #[error(transparent)]
    DB(#[from] ethui_db::Error),

    #[error("invalid network")]
    InvalidNetwork,

    #[error(transparent)]
    ReqwestError(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// TODO: revisit this to correctly respond with the appropriate status code
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()).into_response()
    }
}
