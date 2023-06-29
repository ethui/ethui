use eyre::Report;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Env(Report),
    #[error(transparent)]
    Database(#[from] foundry_evm::executor::backend::DatabaseError),
    #[error(transparent)]
    CallRaw(Report),
    #[error("Evm revert error")]
    Revert(revm::interpreter::InstructionResult),
}

pub type Result<T> = std::result::Result<T, Error>;
