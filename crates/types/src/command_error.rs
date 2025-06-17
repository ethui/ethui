use color_eyre::Report;
use serde::{Serialize, Serializer};

#[derive(thiserror::Error, Debug)]
pub enum CommandError {
    #[error(transparent)]
    Other(#[from] Report),
}

impl Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type CommandResult<T> = std::result::Result<T, CommandError>;
