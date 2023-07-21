#![allow(dead_code)]

use std::{fs::File, io::BufReader, path::PathBuf};

use super::{
    calculate_code_hash,
    error::{Error, Result},
    watcher::Match,
};

#[derive(Debug, Clone, serde::Serialize)]
pub struct Abi {
    pub path: PathBuf,
    pub project: String,
    pub file: String,
    pub name: String,
    pub code_hash: u64,
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

        let deployed_bytecode = json["deployedBytecode"]["object"].clone();

        if abi.is_null() || !deployed_bytecode.is_string() {
            return Err(Error::NotAnABI(m.full_path));
        }

        let code = deployed_bytecode.as_str().unwrap().to_string();
        let code_hash = calculate_code_hash(&code);

        Ok(Self {
            path: m.full_path,
            project: m.project,
            file: m.file,
            name: m.name,
            abi,
            code_hash,
        })
    }
}
