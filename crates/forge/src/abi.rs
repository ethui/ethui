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
