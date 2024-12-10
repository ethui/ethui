use foundry_evm::{
    backend::Backend,
    executors::{Executor, ExecutorBuilder},
    fork::CreateFork,
    opts::EvmOpts,
};

use crate::{
    errors::SimulationResult,
    types::{Request, Result},
};

pub struct Evm {
    executor: Executor,
}

impl Evm {
    pub async fn new(fork_url: String, fork_block_number: Option<u64>, gas_limit: u64) -> Self {
        let foundry_config = foundry_config::Config::default();
        let evm_opts = EvmOpts {
            fork_url: Some(fork_url.clone()),
            fork_block_number,
            env: foundry_evm::opts::Env {
                gas_limit: u64::MAX.into(),
                ..Default::default()
            },
            memory_limit: foundry_config.memory_limit,
            ..Default::default()
        };

        let fork_opts = CreateFork {
            url: fork_url,
            enable_caching: true,
            env: evm_opts.evm_env().await.unwrap(),
            evm_opts,
        };

        let db = Backend::spawn(Some(fork_opts.clone()));

        let executor = ExecutorBuilder::default()
            .gas_limit(gas_limit)
            .build(fork_opts.env, db);

        Evm { executor }
    }

    pub async fn call(&mut self, tx: Request) -> SimulationResult<Result> {
        let res = self.executor.call_raw(
            tx.from,
            tx.to.unwrap_or_default(),
            tx.data.unwrap_or_default(),
            tx.value.unwrap_or_default(),
        )?;

        let traces = if let Some(traces) = res.traces {
            traces.nodes().to_vec()
        } else {
            Vec::new() // Provide a default empty vector
        };

        Ok(Result {
            gas_used: res.gas_used,
            block_number: res.env.block.number.to(),
            success: !res.reverted,
            traces,
            logs: res.logs,
            return_data: res.result.0.into(),
        })
    }
}
