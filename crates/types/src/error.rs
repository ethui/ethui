#[derive(Debug)]
pub struct SerializableError(pub color_eyre::Report);

impl std::fmt::Display for SerializableError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for SerializableError {}

impl serde::Serialize for SerializableError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl From<color_eyre::Report> for SerializableError {
    fn from(err: color_eyre::Report) -> Self {
        Self(err)
    }
}

pub type TauriResult<T> = std::result::Result<T, SerializableError>;
