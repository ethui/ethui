use ethui_types::SafeMultisigTxData;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeContracts {
    pub safes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeMultisigTxs {
    pub results: Vec<SafeMultisigTxData>,
}
