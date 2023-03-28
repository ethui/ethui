use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Network {
    pub name: String,
    pub chain_id: u32,
    pub rpc_url: String,
    pub currency: String,
    pub decimals: u32,
}

impl Network {
    pub fn mainnet() -> Self {
        Self {
            name: String::from("mainnet"),
            chain_id: 1,
            rpc_url: String::from(
                "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs",
            ),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn goerli() -> Self {
        Self {
            name: String::from("goerli"),
            chain_id: 5,
            rpc_url: String::from(
                "https://eth-goerli.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs",
            ),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn anvil() -> Self {
        Self {
            name: String::from("anvil"),
            chain_id: 31337,
            rpc_url: String::from("http://localhost:8545"),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn chain_id_hex(&self) -> String {
        format!("0x{:x}", self.chain_id)
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id, self.name)
    }
}
