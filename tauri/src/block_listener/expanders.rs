use ethers::{
    abi::RawLog,
    contract::EthLogDecode,
    providers::{Http, Middleware, Provider},
    types::{Action, Bytes, Call, Create, CreateResult, Log, Res, Trace},
};
use futures::future::join_all;

use crate::{
    foundry::calculate_code_hash,
    types::{
        events::{ContractDeployed, ERC20Transfer, ERC721Transfer, Tx},
        Event,
    },
};

pub(super) async fn expand_traces(traces: Vec<Trace>, provider: &Provider<Http>) -> Vec<Event> {
    let result = traces.into_iter().map(|t| expand_trace(t, provider));
    join_all(result).await.into_iter().flatten().collect()
}

pub(super) fn expand_logs(traces: Vec<Log>) -> Vec<crate::types::Event> {
    traces.into_iter().filter_map(expand_log).collect()
}

async fn expand_trace(trace: Trace, provider: &Provider<Http>) -> Vec<Event> {
    match (
        trace.action.clone(),
        trace.result.clone(),
        trace.trace_address.len(),
    ) {
        // contract deploys
        (
            Action::Create(Create { from, value, .. }),
            Some(Res::Create(CreateResult { address, .. })),
            _,
        ) => {
            vec![
                Tx {
                    hash: trace.transaction_hash.unwrap(),
                    block_number: trace.block_number,
                    position: trace.transaction_position,
                    from,
                    to: None,
                    value,
                    data: Bytes::new(),
                }
                .into(),
                ContractDeployed {
                    address,
                    code_hash: provider
                        .get_code(address, None)
                        .await
                        .ok()
                        .map(|v| calculate_code_hash(&v.to_string()).to_string()),
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
                ..
            }),
            _,
            0,
        ) => vec![Tx {
            hash: trace.transaction_hash.unwrap(),
            block_number: trace.block_number,
            position: trace.transaction_position,
            from,
            to: Some(to),
            value,
            data: input,
        }
        .into()],

        _ => vec![],
    }
}

fn expand_log(log: Log) -> Option<Event> {
    let raw = RawLog::from((log.topics, log.data.to_vec()));

    use crate::abis::{
        ierc20::{self, IERC20Events},
        ierc721::{self, IERC721Events},
    };

    // decode ERC20 calls
    if let Ok(IERC20Events::TransferFilter(ierc20::TransferFilter { from, to, value })) =
        IERC20Events::decode_log(&raw)
    {
        return Some(
            ERC20Transfer {
                from,
                to,
                value,
                contract: log.address,
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
                from,
                to,
                token_id,
                contract: log.address,
            }
            .into(),
        );
    };

    None
}
