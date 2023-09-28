use std::collections::HashMap;

use ethers::{
    abi::{Address, Hash, Uint},
    core::types::Log,
    types::{transaction::eip2930::AccessList, Bytes},
};
use foundry_config::Chain;
use foundry_evm::{
    executor::{fork::CreateFork, opts::EvmOpts, Backend, Executor, ExecutorBuilder},
    trace::{
        identifier::{EtherscanIdentifier, SignaturesIdentifier},
        node::CallTraceNode,
        CallTraceArena, CallTraceDecoder, CallTraceDecoderBuilder,
    },
};
use foundry_utils::types::{ToAlloy, ToEthers};
use revm::{interpreter::InstructionResult, primitives::Env};

use crate::{
    errors::SimulationResult,
    simulation::{CallTrace, Request, Result},
};

#[derive(Debug, Clone)]
pub struct CallRawRequest {
    pub from: Address,
    pub to: Address,
    pub value: Option<Uint>,
    pub data: Option<Bytes>,
    pub access_list: Option<AccessList>,
    pub format_trace: bool,
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
    pub formatted_trace: Option<String>,
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

#[derive(Debug, Clone, PartialEq)]
pub struct StorageOverride {
    pub slots: HashMap<Hash, Uint>,
    pub diff: bool,
}

pub struct Evm {
    executor: Executor,
    decoder: CallTraceDecoder,
    etherscan_identifier: Option<EtherscanIdentifier>,
}

impl Evm {
    pub async fn new(
        env: Option<Env>,
        fork_url: String,
        fork_block_number: Option<u64>,
        gas_limit: u64,
    ) -> Self {
        let foundry_config = foundry_config::Config::default();
        let evm_opts = EvmOpts {
            fork_url: Some(fork_url.clone()),
            fork_block_number,
            env: foundry_evm::executor::opts::Env {
                chain_id: None,
                code_size_limit: None,
                gas_price: Some(0),
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

        let builder = ExecutorBuilder::default().gas_limit(gas_limit.to_alloy());

        let executor = if let Some(env) = env {
            builder.build(env, db)
        } else {
            builder.build(fork_opts.env.clone(), db)
        };

        let chain: Chain = fork_opts.env.cfg.chain_id.into();
        let etherscan_identifier = EtherscanIdentifier::new(&foundry_config, Some(chain)).ok();
        let mut decoder_builder = CallTraceDecoderBuilder::new().with_verbosity(5);

        if let Ok(identifier) =
            SignaturesIdentifier::new(foundry_config::Config::foundry_cache_dir(), false)
        {
            decoder_builder = decoder_builder.with_signature_identifier(identifier);
        }

        let decoder = decoder_builder.build();

        Evm {
            executor,
            decoder,
            etherscan_identifier,
        }
    }

    #[allow(unused)]
    pub(crate) async fn call(
        &mut self,
        transaction: Request,
        commit: bool,
    ) -> SimulationResult<Result> {
        let call = CallRawRequest {
            from: transaction.from,
            to: transaction.to,
            value: transaction.value.map(Uint::from),
            data: transaction.data,
            access_list: transaction.access_list,
            format_trace: transaction.format_trace.unwrap_or_default(),
        };
        let result = if commit {
            self.call_raw_committing(call, transaction.gas_limit)
                .await?
        } else {
            self.call_raw(call).await?
        };

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
                .map(CallTrace::from)
                .collect(),
            logs: result.logs,
            exit_reason: result.exit_reason,
            formatted_trace: result.formatted_trace,
            return_data: result.return_data,
        })
    }

    pub async fn call_raw(&mut self, call: CallRawRequest) -> SimulationResult<CallRawResult> {
        self.set_access_list(call.access_list);
        let res = self.executor.call_raw(
            call.from.to_alloy(),
            call.to.to_alloy(),
            call.data.unwrap_or_default().0.into(),
            call.value.unwrap_or_default().to_alloy(),
        )?;

        let formatted_trace = if call.format_trace {
            let mut output = String::new();
            for trace in &mut res.traces.clone() {
                if let Some(identifier) = &mut self.etherscan_identifier {
                    self.decoder.identify(trace, identifier);
                }
                self.decoder.decode(trace).await;
                output.push_str(format!("{trace}").as_str());
            }
            Some(output)
        } else {
            None
        };

        Ok(CallRawResult {
            gas_used: res.gas_used,
            block_number: res.env.block.number.to(),
            success: !res.reverted,
            trace: res.traces,
            logs: res.logs,
            exit_reason: res.exit_reason,
            return_data: res.result.0.into(),
            formatted_trace,
        })
    }

    pub async fn call_raw_committing(
        &mut self,
        call: CallRawRequest,
        gas_limit: u64,
    ) -> SimulationResult<CallRawResult> {
        self.executor.set_gas_limit(gas_limit.to_alloy());
        self.set_access_list(call.access_list);
        let res = self.executor.call_raw_committing(
            call.from.to_alloy(),
            call.to.to_alloy(),
            call.data.unwrap_or_default().0.into(),
            call.value.unwrap_or_default().to_alloy(),
        )?;

        let formatted_trace = if call.format_trace {
            let mut output = String::new();
            for trace in &mut res.traces.clone() {
                if let Some(identifier) = &mut self.etherscan_identifier {
                    self.decoder.identify(trace, identifier);
                }
                self.decoder.decode(trace).await;
                output.push_str(format!("{trace}").as_str());
            }
            Some(output)
        } else {
            None
        };

        Ok(CallRawResult {
            gas_used: res.gas_used,
            block_number: res.env.block.number.to(),
            success: !res.reverted,
            trace: res.traces,
            logs: res.logs,
            exit_reason: res.exit_reason,
            return_data: res.result.0.into(),
            formatted_trace,
        })
    }

    pub async fn set_block(&mut self, number: u64) -> SimulationResult<()> {
        self.executor.env.block.number = number.to_alloy();
        Ok(())
    }

    pub fn get_block(&self) -> Uint {
        self.executor.env.block.number.to_ethers()
    }

    pub async fn set_block_timestamp(&mut self, timestamp: u64) -> SimulationResult<()> {
        self.executor.env.block.timestamp = timestamp.to_alloy();
        Ok(())
    }

    pub fn get_block_timestamp(&self) -> Uint {
        self.executor.env.block.timestamp.to_ethers()
    }

    pub fn get_chain_id(&self) -> Uint {
        self.executor.env.cfg.chain_id.into()
    }

    fn set_access_list(&mut self, access_list: Option<AccessList>) {
        self.executor.env.tx.access_list = access_list
            .unwrap_or_default()
            .0
            .into_iter()
            .map(|item| {
                (
                    item.address.to_alloy(),
                    item.storage_keys
                        .into_iter()
                        .map(|key| Uint::from_big_endian(key.as_bytes()).to_alloy())
                        .collect(),
                )
            })
            .collect();
    }
}
