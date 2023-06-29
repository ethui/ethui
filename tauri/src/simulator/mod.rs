mod error;
mod evm;

use std::str::FromStr;

use evm::Evm;

use url::Url;

pub use error::{Error, Result};

use ethers::types::{Address, Log, H256, U256};
use serde::{Deserialize, Serialize};

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simulate_detris() {
        let bytes = ethers::types::Bytes::from_str("0x1249c58b".into())
            .unwrap()
            .to_vec();

        let fork_url: Url =
            Url::from_str("https://eth-mainnet.g.alchemy.com/v2/Ean6MidgkuC267l01I9stizXn83K4X3S")
                .unwrap();

        let result = simulate(
            Address::from_str("0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503".into()).unwrap(),
            Address::from_str("0xf0f8628d496782d6a9c724f047d14b4fc2569ea1".into()).unwrap(),
            U256::from(0),
            Some(bytes),
            fork_url,
            Some(17579630),
        )
        .unwrap();

        let expected_result_json = r#"
        {
          "gas_used":118246,
          "reverted":false,
          "logs":[
             {
                "address":"0xbdc105c068715d57860702da9fa0c5ead11fba51",
                "topics":[
                   "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                   "0x0000000000000000000000000000000000000000000000000000000000000000",
                   "0x00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d503",
                   "0x0000000000000000000000000000000000000000000000000000000000000022"
                ],
                "data":"0x"
             }
          ],
          "balance_before":"0x7be0dcdf9adea3af3ef0",
          "balance_after":"0x7be0dcdf9adea3af3ef0",
          "erc20s":[
             {
                "token":"0xbdc105c068715d57860702da9fa0c5ead11fba51",
                "from":"0x0000000000000000000000000000000000000000",
                "to":"0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503",
                "amount":"0x0"
             }
          ]
       }"#;

        let expected_result: CallResult = serde_json::from_str(&expected_result_json).unwrap();

        assert_eq!(result, expected_result)
    }

    #[test]
    fn simulate_uniswap() {
        let fork_url: Url =
            Url::from_str("https://eth-mainnet.g.alchemy.com/v2/Ean6MidgkuC267l01I9stizXn83K4X3S")
                .unwrap();

        let data = ethers::types::Bytes::from_str("0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000645ed58700000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000059cdeffade58beb5b000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f46b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000".into())
            .unwrap()
            .to_vec();

        let result = simulate(
            Address::from_str("0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503".into()).unwrap(),
            Address::from_str("0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b".into()).unwrap(),
            U256::from_str("0xde0b6b3a7640000").unwrap(),
            Some(data),
            fork_url,
            Some(17579630),
        )
        .unwrap();

        let expected_result_json = r#"
        {
          "gas_used":131104,
          "reverted":false,
          "logs":[
             {
                "address":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "topics":[
                   "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c",
                   "0x000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b"
                ],
                "data":"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
             },
             {
                "address":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "topics":[
                   "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                   "0x000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
                   "0x000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b"
                ],
                "data":"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
             },
             {
                "address":"0x6b175474e89094c44da98b954eedeac495271d0f",
                "topics":[
                   "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                   "0x00000000000000000000000060594a405d53811d3bc4766596efd80fd545a270",
                   "0x00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d503"
                ],
                "data":"0x0000000000000000000000000000000000000000000000643f06afdff0e59f0e"
             },
             {
                "address":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "topics":[
                   "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                   "0x000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
                   "0x00000000000000000000000060594a405d53811d3bc4766596efd80fd545a270"
                ],
                "data":"0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
             },
             {
                "address":"0x60594a405d53811d3bc4766596efd80fd545a270",
                "topics":[
                   "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
                   "0x000000000000000000000000ef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
                   "0x00000000000000000000000047ac0fb4f2d84898e4d9e7b4dab3c24507a6d503"
                ],
                "data":"0xffffffffffffffffffffffffffffffffffffffffffffff9bc0f950200f1a60f20000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000005f3a4d3a02369afe5c91af5000000000000000000000000000000000000000000014c7979ca834b2b386d8dfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeda1e"
             }
          ],
          "balance_before":"0x7be0dcdf9adea3af3ef0",
          "balance_after":"0x7be0dcdf9adea3af3ef0",
          "erc20s":[
             {
                "token":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "from":"0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
                "to":"0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
                "amount":"0xde0b6b3a7640000"
             },
             {
                "token":"0x6b175474e89094c44da98b954eedeac495271d0f",
                "from":"0x60594a405d53811d3bc4766596efd80fd545a270",
                "to":"0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503",
                "amount":"0x643f06afdff0e59f0e"
             },
             {
                "token":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "from":"0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
                "to":"0x60594a405d53811d3bc4766596efd80fd545a270",
                "amount":"0xde0b6b3a7640000"
             }
          ]
       }"#;

        let expected_result: CallResult = serde_json::from_str(&expected_result_json).unwrap();

        assert_eq!(result, expected_result)
    }
}
