use crate::Address;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Contract {
    pub chain_id: u32,
    pub name: Option<String>,
    pub address: Address,
}
