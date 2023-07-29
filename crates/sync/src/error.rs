#[derive(Debug, thiserror::Error)]
pub enum SyncError {
    #[error(transparent)]
    AlchemyError(#[from] iron_sync_alchemy::Error),
}

pub type SyncResult<T> = std::result::Result<T, SyncError>;

impl serde::Serialize for SyncError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
