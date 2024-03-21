use ethui_types::Address;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(tag = "provider", rename_all = "camelCase", content = "address")]
pub enum Feed {
    Chainlink(Address),
}
