use std::str::FromStr;

use ethers::contract::EthLogDecode;
use ethers::{
    abi::RawLog,
    types::{Action, Address, Bytes, Call, Create, CreateResult, Log, Res, Trace, H256, U256},
};
use serde::Serialize;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::abis;

#[derive(Debug)]
pub enum Event {
    Tx(Tx),
    ContractDeployed(ContractDeployed),
    ERC20Transfer(ERC20Transfer),
    ERC721Transfer(ERC721Transfer),
}

#[derive(Debug)]
pub struct Events(pub Vec<Event>);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tx {
    pub hash: H256,
    pub from: Address,
    pub to: Option<Address>,
    pub value: U256,
    pub data: Bytes,
    pub block_number: u64,
    pub position: Option<usize>,
}

#[derive(Debug)]
pub struct ERC20Transfer {
    pub from: Address,
    pub to: Address,
    pub value: U256,
    pub contract: Address,
}

#[derive(Debug)]
pub struct ERC721Transfer {
    pub from: Address,
    pub to: Address,
    pub token_id: U256,
    pub contract: Address,
}

#[derive(Debug)]
pub struct ContractDeployed {
    pub address: Address,
}

impl From<Trace> for Events {
    fn from(trace: Trace) -> Self {
        let events: Vec<Event> = match (trace.action, trace.result, trace.trace_address.len()) {
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
                    ContractDeployed::new(address).into(),
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
        };

        Events(events)
    }
}

impl From<Vec<Trace>> for Events {
    fn from(traces: Vec<Trace>) -> Self {
        let events: Vec<Vec<Event>> = traces
            .into_iter()
            .map(|t| Into::<Events>::into(t).0)
            .collect();

        let result: Vec<Event> = events.into_iter().flatten().collect();
        Events(result)
    }
}

impl TryFrom<Log> for Event {
    type Error = ();
    fn try_from(log: Log) -> Result<Self, Self::Error> {
        let raw = RawLog::from((log.topics, log.data.to_vec()));

        use abis::{
            ierc20::{self, IERC20Events},
            ierc721::{self, IERC721Events},
        };

        // decode ERC20 calls
        if let Ok(IERC20Events::TransferFilter(ierc20::TransferFilter { from, to, value })) =
            IERC20Events::decode_log(&raw)
        {
            return Ok(ERC20Transfer {
                from,
                to,
                value,
                contract: log.address,
            }
            .into());
        };

        if let Ok(IERC721Events::TransferFilter(ierc721::TransferFilter { from, to, token_id })) =
            IERC721Events::decode_log(&raw)
        {
            return Ok(ERC721Transfer {
                from,
                to,
                token_id,
                contract: log.address,
            }
            .into());
        };

        Err(())
    }
}

impl From<Vec<Log>> for Events {
    fn from(logs: Vec<Log>) -> Self {
        let events: Vec<Event> = logs
            .into_iter()
            .filter_map(|t| TryInto::<Event>::try_into(t).ok())
            .collect();

        Events(events)
    }
}

impl ContractDeployed {
    pub fn new(address: Address) -> Self {
        Self { address }
    }
}

impl From<ContractDeployed> for Event {
    fn from(value: ContractDeployed) -> Self {
        Self::ContractDeployed(value)
    }
}

impl From<Tx> for Event {
    fn from(value: Tx) -> Self {
        Self::Tx(value)
    }
}

impl From<ERC20Transfer> for Event {
    fn from(value: ERC20Transfer) -> Self {
        Self::ERC20Transfer(value)
    }
}

impl From<ERC721Transfer> for Event {
    fn from(value: ERC721Transfer) -> Self {
        Self::ERC721Transfer(value)
    }
}

impl TryFrom<&SqliteRow> for Tx {
    type Error = ();

    fn try_from(row: &SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            hash: H256::from_str(row.get("hash")).unwrap(),
            from: Address::from_str(row.get("from_address")).unwrap(),
            to: Address::from_str(row.get("to_address")).ok(),
            value: U256::from_str_radix(row.get("value"), 10).unwrap(),
            data: Bytes::from_str(row.get("data")).unwrap(),
            block_number: row.get::<i64, _>("block_number") as u64,
            position: Some(row.get::<i32, _>("position") as usize),
        })
    }
}
