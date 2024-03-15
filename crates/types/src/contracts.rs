use serde::Serialize;

use crate::{Abi, Address};

#[derive(Debug, Serialize)]
pub struct Contract {
    pub chain_id: u32,
    pub name: Option<String>,
    pub address: Address,
}

#[derive(Debug, Serialize)]
pub struct ContractWithAbi {
    pub chain_id: u32,
    pub name: Option<String>,
    pub address: Address,
    pub abi: Option<Abi>,
}
