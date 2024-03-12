use ethers::types::CallResult;
use ethers::{
    abi::RawLog,
    contract::EthLogDecode,
    providers::{Http, Middleware, Provider},
    types::{Action, Call, Create, CreateResult, Log, Res, Trace},
};
use futures::future::join_all;
use iron_types::{
    events::{ContractDeployed, ERC20Transfer, ERC721Transfer, Tx},
    Bytes, Event, ToAlloy,
};

use super::{Error, Result};

pub(super) async fn expand_traces(traces: Vec<Trace>, provider: &Provider<Http>) -> Vec<Event> {
    let result = traces.into_iter().map(|t| expand_trace(t, provider));
    let res = join_all(result).await.into_iter().filter_map(|r| r.ok());

    res.flatten().collect()
}

pub(super) fn expand_logs(traces: Vec<Log>) -> Vec<iron_types::Event> {
    traces.into_iter().filter_map(expand_log).collect()
}

async fn expand_trace(trace: Trace, provider: &Provider<Http>) -> Result<Vec<Event>> {
    let hash = trace.transaction_hash.unwrap();
    let tx = provider
        .get_transaction(hash)
        .await?
        .ok_or(Error::TxNotFound(hash.to_alloy()))?;
    let receipt = provider
        .get_transaction_receipt(hash)
        .await?
        .ok_or(Error::TxNotFound(hash.to_alloy()))?;
    let block_number = trace.block_number;

    let res = match (
        trace.action.clone(),
        trace.result.clone(),
        trace.trace_address.len(),
    ) {
        // contract deploys
        (
            Action::Create(Create {
                from, value, gas, ..
            }),
            Some(Res::Create(CreateResult {
                address, gas_used, ..
            })),
            _,
        ) => {
            vec![
                Tx {
                    hash: trace.transaction_hash.unwrap().to_alloy(),
                    position: trace.transaction_position,
                    from: from.to_alloy(),
                    to: None,
                    value: Some(value.to_alloy()),
                    data: Some(Bytes::default()),
                    status: receipt.status.unwrap().as_u64(),
                    block_number: Some(block_number),
                    deployed_contract: Some(address.to_alloy()),
                    gas_limit: Some(gas.to_alloy()),
                    gas_used: Some(gas_used.to_alloy()),
                    max_fee_per_gas: tx.max_fee_per_gas.map(|g| g.to_alloy()),
                    max_priority_fee_per_gas: tx.max_fee_per_gas.map(|g| g.to_alloy()),
                    r#type: tx.transaction_type.map(|t| t.as_u64()),
                    nonce: Some(tx.nonce.as_u64()),
                    incomplete: false,
                }
                .into(),
                ContractDeployed {
                    address: address.to_alloy(),
                    code: provider.get_code(address, None).await.ok(),
                    block_number,
                }
                .into(),
            ]
        }

        // TODO: match call input against ERC20 abi

        // top-level trace of a transaction
        // other regular calls
        (
            Action::Call(Call {
                from,
                to,
                value,
                input,
                gas,
                ..
            }),
            Some(Res::Call(CallResult { gas_used, .. })),
            0,
        ) => vec![Tx {
            hash: trace.transaction_hash.unwrap().to_alloy(),
            position: trace.transaction_position,
            from: from.to_alloy(),
            to: Some(to.to_alloy()),
            value: Some(value.to_alloy()),
            data: Some(input),
            status: receipt.status.unwrap().as_u64(),
            block_number: Some(block_number),
            gas_limit: Some(gas.to_alloy()),
            gas_used: Some(gas_used.to_alloy()),
            max_fee_per_gas: tx.max_fee_per_gas.map(|g| g.to_alloy()),
            max_priority_fee_per_gas: tx.max_fee_per_gas.map(|g| g.to_alloy()),
            nonce: Some(tx.nonce.as_u64()),
            r#type: tx.transaction_type.map(|t| t.as_u64()),
            deployed_contract: None,
            incomplete: false,
        }
        .into()],

        _ => vec![],
    };

    Ok(res)
}

fn expand_log(log: Log) -> Option<Event> {
    let raw = RawLog::from((log.topics, log.data.to_vec()));
    let block_number = log.block_number?.as_u64();

    use iron_abis::{
        ierc20::{self, IERC20Events},
        ierc721::{self, IERC721Events},
    };

    // decode ERC20 calls
    if let Ok(IERC20Events::TransferFilter(ierc20::TransferFilter { from, to, value })) =
        IERC20Events::decode_log(&raw)
    {
        return Some(
            ERC20Transfer {
                from: from.to_alloy(),
                to: to.to_alloy(),
                value: value.to_alloy(),
                contract: log.address.to_alloy(),
                block_number,
            }
            .into(),
        );
    };

    // decode ERC721 calls
    if let Ok(IERC721Events::TransferFilter(ierc721::TransferFilter { from, to, token_id })) =
        IERC721Events::decode_log(&raw)
    {
        return Some(
            ERC721Transfer {
                from: from.to_alloy(),
                to: to.to_alloy(),
                token_id: token_id.to_alloy(),
                contract: log.address.to_alloy(),
                block_number,
            }
            .into(),
        );
    };

    None
}
