use crate::{Address, B256, U64};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemyAssetTransfer {
    pub block_num: U64,
    pub hash: B256,
    pub from: Address,
    pub to: Option<Address>,
}
