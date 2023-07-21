#![allow(dead_code)]

use std::str::FromStr;
use std::{fs::File, io::BufReader, path::PathBuf};

use ethers::types::Bytes;

use super::{
    error::{Error, Result},
    watcher::Match,
};

#[derive(Debug, Clone, serde::Serialize)]
pub struct Abi {
    pub path: PathBuf,
    pub project: String,
    pub file: String,
    pub name: String,
    pub code: Bytes,
    pub abi: serde_json::Value,
}

impl Abi {
    pub(super) fn try_from_match(m: Match) -> Result<Self> {
        // TODO: this won't work in windows I supose

        if !m.full_path.exists() {
            return Err(Error::FileNotFound(m.full_path));
        }

        let file = File::open(m.full_path.clone()).unwrap();
        let json: serde_json::Value = serde_json::from_reader(BufReader::new(file))?;

        let abi = json["abi"].clone();
        if abi.as_array().map(|a| a.is_empty()).unwrap_or(true) {
            return Err(Error::EmptyABI(m.full_path));
        }

        let bytecode = json["bytecode"]["object"].clone();

        if abi.is_null() || !bytecode.is_string() {
            return Err(Error::NotAnABI(m.full_path));
        }

        let code = Bytes::from_str(bytecode.as_str().unwrap()).unwrap();
        //let code_hash = calculate_code_hash(&code);

        Ok(Self {
            path: m.full_path,
            project: m.project,
            file: m.file,
            name: m.name,
            abi,
            code,
        })
    }
}

// TODO:
// we need to match the runtime bytecode (from eth_getCode) with the deployed_bytecode as given by
// foundry outputs
// forge output 0x6080604052348015600f57600080fd5b506004361060285760003560e01c8063243dc8da14602d575b600080fd5b7f000000000000000000000000000000000000000000000000000000000000000060405190815260200160405180910390f3fea264697066735822122088861d3154dc1a11576acc4684998a3bd885452b8b49e5f9b853d8fb82a4f79b64736f6c634300080d0033
// eth_getCode  0x6080604052348015600f57600080fd5b506004361060285760003560e01c8063243dc8da14602d575b600080fd5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60405190815260200160405180910390f3fea264697066735822122088861d3154dc1a11576acc4684998a3bd885452b8b49e5f9b853d8fb82a4f79b64736f6c634300080d0033
// we should create a mask where, for every 0x00 byte in `forge output` we ignore that same byte on the runtime code, ending up with:
// forge output 0x6080604052348015600f576080fd5b5060043610602857603560e01c8063243dc8da14602d575b6080fd5b7f60405190815260200160405180910390f3fea264697066735822122088861d3154dc1a11576acc4684998a3bd885452b8b49e5f9b853d8fb82a4f79b64736f6c6343080d33
// eth_getCode  0x6080604052348015600f576080fd5b5060043610602857603560e01c8063243dc8da14602d575b6080fd5b7f60405190815260200160405180910390f3fea264697066735822122088861d3154dc1a11576acc4684998a3bd885452b8b49e5f9b853d8fb82a4f79b64736f6c6343080d33
