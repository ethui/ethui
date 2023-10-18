#[derive(thiserror::Error, Debug)]
pub enum SimulationError {
    #[error(transparent)]
    Evm(#[from] eyre::Report),

    #[error(transparent)]
    Provider(#[from] ethers::providers::ProviderError),
}

pub type SimulationResult<T> = std::result::Result<T, SimulationError>;

impl serde::Serialize for SimulationError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
