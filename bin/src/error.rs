pub use ethui_types::{SerializableError, TauriResult};

// For backwards compatibility, we'll alias AppError to SerializableError for the bin crate
pub type AppError = SerializableError;
pub type AppResult<T> = color_eyre::Result<T>;
