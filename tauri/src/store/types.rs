use ethers::contract::EthLogDecode;
use ethers::{
    abi::RawLog,
    types::{Action, Address, Bytes, Call, Create, CreateResult, Log, Res, Trace, H256, U256},
};

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

#[derive(Debug)]
pub struct Tx {
    pub hash: H256,
    pub from: Address,
    pub to: Option<Address>,
    pub value: U256,
    pub data: Bytes,
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
                        from,
                        to: None,
                        value,
                        data: Bytes::new(),
                    }
                    .into(),
                    ContractDeployed::new(address).into(),
                ]
            }

            // top-level trace of a transaction
            (action, _, 0) => match action {
                // TODO: match call input against ERC20 abi

                // other regular calls
                Action::Call(Call {
                    from,
                    to,
                    value,
                    input,
                    ..
                }) => vec![Tx {
                    hash: trace.transaction_hash.unwrap(),
                    from,
                    to: Some(to),
                    value,
                    data: input,
                }
                .into()],

                // we already capture contract deploys somewhere else
                _ => vec![],
            },

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
        match IERC20Events::decode_log(&raw) {
            Ok(IERC20Events::TransferFilter(ierc20::TransferFilter { from, to, value })) => {
                return Ok(ERC20Transfer {
                    from,
                    to,
                    value,
                    contract: log.address,
                }
                .into())
            }
            _ => {}
        };

        match IERC721Events::decode_log(&raw) {
            Ok(IERC721Events::TransferFilter(ierc721::TransferFilter { from, to, token_id })) => {
                return Ok(ERC721Transfer {
                    from,
                    to,
                    token_id,
                    contract: log.address,
                }
                .into())
            }
            _ => {}
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
