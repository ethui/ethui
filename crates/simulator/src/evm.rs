use alloy_primitives::{Bytes, Log, U256};
use foundry_evm::{
    backend::Backend,
    executors::{Executor, ExecutorBuilder},
    fork::CreateFork,
    opts::EvmOpts,
    traces::{CallTraceArena, CallTraceNode},
};
use iron_types::{Address, ToAlloy};
use revm::interpreter::InstructionResult;

use crate::{
    errors::SimulationResult,
    types::{CallTrace, Request, Result},
};

#[derive(Debug, Clone)]
pub struct CallRawRequest {
    pub from: Address,
    pub to: Address,
    pub value: Option<U256>,
    pub data: Option<Bytes>,
}

#[derive(Debug, Clone)]
pub struct CallRawResult {
    pub gas_used: u64,
    pub block_number: u64,
    pub success: bool,
    pub trace: Option<CallTraceArena>,
    pub logs: Vec<Log>,
    pub exit_reason: InstructionResult,
    pub return_data: Bytes,
}

impl From<Request> for CallRawRequest {
    fn from(value: Request) -> Self {
        Self {
            from: value.from,
            to: value.to,
            value: value.value,
            data: value.data,
        }
    }
}

impl From<CallTraceNode> for CallTrace {
    fn from(item: CallTraceNode) -> Self {
        CallTrace {
            call_type: item.trace.kind,
            from: item.trace.caller,
            to: item.trace.address,
            value: item.trace.value,
        }
    }
}

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
                gas_limit: u64::MAX,
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

        let db = Backend::spawn(Some(fork_opts.clone())).await;

        let executor = ExecutorBuilder::default()
            .gas_limit(gas_limit.to_alloy())
            .build(fork_opts.env, db);

        Evm { executor }
    }

    pub async fn call(&mut self, transaction: Request) -> SimulationResult<Result> {
        let call = transaction.clone().into();

        let result = self.call_raw(call).await?;

        Ok(Result {
            simulation_id: 1,
            gas_used: result.gas_used,
            block_number: result.block_number,
            success: result.success,
            trace: result
                .trace
                .unwrap_or_default()
                .arena
                .into_iter()
                .map(CallTraceNode::from)
                .collect(),
            logs: result.logs,
            exit_reason: result.exit_reason,
            return_data: result.return_data,
        })
    }

    pub async fn call_raw(&mut self, call: CallRawRequest) -> SimulationResult<CallRawResult> {
        let res = self.executor.call_raw(
            call.from,
            call.to,
            call.data.unwrap_or_default().0.into(),
            call.value.unwrap_or_default(),
        )?;

        Ok(CallRawResult {
            gas_used: res.gas_used,
            block_number: res.env.block.number.to(),
            success: !res.reverted,
            trace: res.traces,
            logs: res
                .logs
                .into_iter()
                .map(|l| {
                    Log::new_unchecked(
                        l.topics.into_iter().map(|t| t.to_alloy()).collect(),
                        l.data.to_alloy(),
                    )
                })
                .collect(),
            exit_reason: res.exit_reason,
            return_data: res.result.0.into(),
        })
    }
}
