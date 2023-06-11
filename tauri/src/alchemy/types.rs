use ethers::types::{Address, U256};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Balances {
    pub address: Address,
    pub token_balances: Vec<TokenBalance>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TokenBalance {
    pub contract_address: Address,
    pub token_balance: U256,
}

impl From<TokenBalance> for (Address, U256) {
    fn from(value: TokenBalance) -> Self {
        (value.contract_address, value.token_balance)
    }
}
