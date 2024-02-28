use crate::U64;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "category", rename_all = "camelCase")]
pub enum AlchemyAssetTransfer {
    External(AlchemyAssetTransferData),
    Internal(AlchemyAssetTransferData),
    Erc20(AlchemyAssetTransferData),
    Erc721(AlchemyAssetTransferData),
    Erc1155(AlchemyAssetTransferData),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemyAssetTransferData {
    pub unique_id: String,
    pub block_num: U64,
}
