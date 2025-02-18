use serde::Deserialize;

#[derive(Deserialize, Debug, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TxIdx {
    pub block_number: u64,
    pub position: u64,
}
