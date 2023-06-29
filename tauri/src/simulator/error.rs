use eyre::Report;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    EvmEnv(Report),
    #[error(transparent)]
    EvmDatabase(#[from] foundry_evm::executor::backend::DatabaseError),
    #[error("Evm Call Raw error")]
    EvmCallRaw(Report),
    #[error("Evm revert error")]
    EvmRevert(revm::interpreter::InstructionResult),
}

pub type Result<T> = std::result::Result<T, Error>;
