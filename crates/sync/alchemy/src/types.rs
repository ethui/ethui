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
#[serde(tag = "category", rename_all = "camelCase")]
pub(super) enum Transfer {
    External(TransferData),
    Internal(TransferData),
    Erc20(TransferData),
    Erc721(TransferData),
    Erc1155(TransferData),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TransferData {
    pub unique_id: String,
    pub block_num: U64,
}
