mod evm;

use std::str::FromStr;

pub use error::{Error, Result};
use ethers::types::{Address, Log, H256, U256};
use evm::Evm;
use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct CallResult {
    pub gas_used: u64,
    pub reverted: bool,
    pub logs: Vec<Log>,
    pub balance_before: U256,
    pub balance_after: U256,
    pub erc20s: Vec<ERC20Transfer>,
}

#[derive(Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ERC20Transfer {
    pub token: Address,
    pub from: Address,
    pub to: Address,
    pub amount: U256,
}

pub fn simulate(
    from: Address,
    to: Address,
    value: U256,
    data: Option<Vec<u8>>,
    fork_url: Url,
    fork_block_number: Option<u64>,
) -> Result<CallResult> {
    let gas_limit = 18446744073709551615;

    let mut evm = Evm::new(fork_url, fork_block_number, gas_limit, true)?;

    let info = evm.basic(from)?;
    let balance_before: U256 = info.unwrap().balance.into();

    let info = evm.basic(from)?;
    let balance_after: U256 = info.unwrap().balance.into();

    let erc20topic =
        H256::from_str("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef")
            .unwrap();

    let result = evm.call_raw_committing(from, to, Some(value), data)?;

    let erc20s = result
        .logs
        .iter()
        .filter(|l| l.topics[0] == erc20topic)
        .map(|l| ERC20Transfer {
            token: l.address,
            from: l.topics[1].into(),
            to: l.topics[2].into(),
            amount: U256::from_str(&format!("{}", l.data)).unwrap(),
        })
        .collect();

    Ok(CallResult {
        gas_used: result.gas_used,
        reverted: result.reverted,
        logs: result.logs,
        balance_before,
        balance_after,
        erc20s,
    })
}
