use super::error::{
    Error::{EvmCallRaw, EvmEnv, EvmRevert},
    Result,
};
use ethers::types::{Address, U256};
use foundry_evm::executor::{
    fork::CreateFork, opts::EvmOpts, Backend, DatabaseRef, Executor, ExecutorBuilder, RawCallResult,
};
use revm::primitives::AccountInfo;
use url::Url;

#[derive(Debug, Clone)]
pub struct EVM(Executor);

impl EVM {
    pub fn db(&self) -> &Backend {
        self.0.backend()
    }
}

impl EVM {
    pub fn new(
        fork_url: Url,
        fork_block_number: Option<u64>,
        gas_limit: u64,
        tracing: bool,
    ) -> Result<Self> {
        let evm_opts = EvmOpts {
            fork_url: Some(fork_url.to_string()),
            fork_block_number,
            ..Default::default()
        };

        let env = evm_opts.evm_env_blocking().map_err(|e| EvmEnv(e))?;
        let fork_opts = Some(CreateFork {
            url: fork_url.to_string(),
            enable_caching: true,
            env,
            evm_opts,
        });

        let db = Backend::spawn(fork_opts);

        let builder = ExecutorBuilder::default()
            .with_gas_limit(gas_limit.into())
            .set_tracing(tracing);

        let executor = builder.build(db);

        Ok(EVM(executor))
    }

    pub fn basic(&self, address: Address) -> Result<Option<AccountInfo>> {
        let db = self.db();

        let acc = db.basic(address.into())?;
        Ok(acc.map(Into::into))
    }

    pub fn call_raw_committing(
        &mut self,
        caller: Address,
        to: Address,
        value: Option<U256>,
        data: Option<Vec<u8>>,
    ) -> Result<RawCallResult> {
        let res = self
            .0
            .call_raw_committing(
                caller,
                to,
                data.unwrap_or_default().into(),
                value.unwrap_or_default(),
            )
            .map_err(|e| EvmCallRaw(e))?;

        if res.reverted {
            return Err(EvmRevert(res.exit_reason));
        }

        Ok(res)
    }
}
