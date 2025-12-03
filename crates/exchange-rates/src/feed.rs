use common::Address;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(tag = "provider", rename_all = "camelCase", content = "address")]
pub enum Feed {
    Chainlink(#[allow(unused)] Address),
}
