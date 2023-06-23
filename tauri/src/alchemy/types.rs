use ethers::types::{Address, U256, U64};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Balances {
    pub address: Address,
    pub token_balances: Vec<TokenBalance>,
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Transfers {
    pub transfers: Vec<Transfer>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Transfer {
    pub category: Category,
    pub unique_id: String,
    pub block_num: U64,
    // pub value: U256,
    // pub from: Address,
    // pub to: Address,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Category {
    External,
    Internal,
    Token,
    ERC20,
    ERC721,
    ERC1155,
    SpecialNFT,
}
