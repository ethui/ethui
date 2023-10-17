use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Forge(#[from] iron_forge::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    Connection(#[from] iron_connections::Error),

    #[error(transparent)]
    Network(#[from] iron_networks::Error),

    #[error(transparent)]
    Settings(#[from] iron_settings::Error),

    #[error(transparent)]
    Simulation(#[from] iron_simulator::errors::SimulationError),

    #[error(transparent)]
    Wallets(#[from] iron_wallets::Error),

    #[error("invalid chain id: {0}")]
    InvalidChainId(u32),

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error("invalid network")]
    InvalidNetwork,
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
