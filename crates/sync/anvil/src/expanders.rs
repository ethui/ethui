use alloy::{
    consensus::{Transaction as _, TxType},
    network::Ethereum,
    primitives::{Bytes, Log},
    providers::{Provider as _, RootProvider},
    rpc::types::{
        Log as RpcLog,
        trace::parity::{
            Action, CallAction, CallOutput, CreateAction, CreateOutput, LocalizedTransactionTrace,
            TraceOutput,
        },
    },
    sol_types::SolEvent as _,
};
use color_eyre::eyre::ContextCompat as _;
use common::{
    Event,
    events::{ContractDeployed, ERC20Transfer, Tx},
};
use futures::future::join_all;

pub(super) async fn expand_traces(
    traces: Vec<LocalizedTransactionTrace>,
    provider: &RootProvider<Ethereum>,
) -> Vec<Event> {
    let result = traces.into_iter().map(|t| expand_trace(t, provider));
    let res = join_all(result).await.into_iter().filter_map(|r| r.ok());

    res.flatten().collect()
}

pub(super) fn expand_logs(traces: Vec<RpcLog>) -> Vec<common::Event> {
    traces.into_iter().filter_map(expand_log).collect()
}

async fn expand_trace(
    trace: LocalizedTransactionTrace,
    provider: &RootProvider<Ethereum>,
) -> color_eyre::Result<Vec<Event>> {
    let hash = trace.transaction_hash.unwrap();
    let tx = provider
        .get_transaction_by_hash(hash)
        .await?
        .with_context(|| format!("Transaction not found: {hash}"))?;
    let receipt = provider
        .get_transaction_receipt(hash)
        .await?
        .with_context(|| format!("Transaction not found: {hash}"))?;
    let block_number = trace.block_number;

    let res = match (
        trace.trace.action.clone(),
        trace.trace.result.clone(),
        trace.trace.trace_address.len(),
    ) {
        // contract deploys
        (
            Action::Create(CreateAction {
                from, value, gas, ..
            }),
            Some(TraceOutput::Create(CreateOutput {
                address, gas_used, ..
            })),
            _,
        ) => {
            let proxy_type = proxy_detect::detect_proxy(address, &provider).await?;

            vec![
                Tx {
                    hash: trace.transaction_hash.unwrap(),
                    trace_address: Some(trace.trace.trace_address.clone()),
                    position: trace.transaction_position.map(|p| p as usize),
                    from,
                    to: None,
                    value: Some(value),
                    data: Some(Bytes::default()),
                    status: if receipt.status() { 1 } else { 0 },
                    block_number,
                    deployed_contract: Some(address),
                    gas_limit: Some(gas),
                    gas_used: Some(gas_used),
                    max_fee_per_gas: tx.inner.as_eip1559().map(|t| t.tx().max_fee_per_gas),
                    max_priority_fee_per_gas: tx.inner.as_eip1559().map(|t| t.tx().max_fee_per_gas),
                    r#type: Some(<TxType as Into<u8>>::into(tx.inner.tx_type()) as u64),
                    nonce: Some(tx.inner.nonce()),
                    incomplete: false,
                }
                .into(),
                ContractDeployed {
                    address,
                    code: provider.get_code_at(address).await.ok(),
                    block_number,
                    proxy_for: proxy_type.map(|proxy| proxy.implementation()),
                }
                .into(),
            ]
        }

        // TODO: match call input against ERC20 abi

        // top-level trace of a transaction
        // other regular calls
        (
            Action::Call(CallAction {
                from,
                to,
                value,
                input,
                gas,
                ..
            }),
            Some(TraceOutput::Call(CallOutput { gas_used, .. })),
            0,
        ) => vec![
            Tx {
                hash: trace.transaction_hash.unwrap(),
                trace_address: Some(trace.trace.trace_address.clone()),
                position: trace.transaction_position.map(|p| p as usize),
                from,
                to: Some(to),
                value: Some(value),
                data: Some(input),
                status: if receipt.status() { 1 } else { 0 },
                block_number,
                gas_limit: Some(gas),
                gas_used: Some(gas_used),
                max_fee_per_gas: tx.inner.as_eip1559().map(|t| t.tx().max_fee_per_gas),
                max_priority_fee_per_gas: tx.inner.as_eip1559().map(|t| t.tx().max_fee_per_gas),
                nonce: Some(tx.inner.nonce()),
                r#type: Some(<TxType as Into<u8>>::into(tx.inner.tx_type()) as u64),
                deployed_contract: None,
                incomplete: false,
            }
            .into(),
        ],

        _ => vec![],
    };

    Ok(res)
}

fn expand_log(log: RpcLog) -> Option<Event> {
    let block_number = log.block_number?;

    use abis::IERC20;

    if let Ok(Log { data, .. }) = IERC20::Transfer::decode_log(&log.inner) {
        return Some(
            ERC20Transfer {
                from: data.from,
                to: data.to,
                value: data.value,
                contract: log.inner.address,
                block_number,
            }
            .into(),
        );
    };

    None
}
