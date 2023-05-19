#![allow(dead_code)]

use std::{fs::File, io::BufReader, path::PathBuf};

use regex::Regex;

use super::calculate_code_hash;

#[derive(Debug, Clone)]
pub(super) struct Abi {
    pub path: PathBuf,
    pub project: String,
    pub file: String,
    pub name: String,
    pub code_hash: u64,
    pub abi: serde_json::Value,
}

impl Abi {
    pub fn try_from_file(path: PathBuf) -> Result<Self, ()> {
        // TODO: this won't work in windows I supose
        let re = Regex::new(
            r#"(?x)
        \/
        (?<project>[^\/]+) # project name
        \/out\/
        (?<file>[^\/]+) # file path
        \/
        (?<name>[^\/]+) # abi name
        .json 
        $"#,
        )
        .unwrap();

        let path_str = path.clone();
        let path_str = path_str.to_str().unwrap();
        let caps = re.captures(path_str);
        if caps.is_none() {
            return Err(());
        }
        let caps = caps.unwrap();

        if !path.exists() {
            return Err(());
        }

        let file = File::open(path.clone()).unwrap();
        let reader = BufReader::new(file);

        let json: Result<serde_json::Value, _> = serde_json::from_reader(reader);

        if json.is_err() {
            return Err(());
        }
        let json = json.unwrap();

        let abi = json["abi"].clone();
        let deployed_bytecode = json["deployedBytecode"]["object"].clone();

        if abi.is_null() || !deployed_bytecode.is_string() {
            return Err(());
        }

        let code = deployed_bytecode.as_str().unwrap().to_string();
        let code_hash = calculate_code_hash(&code);

        Ok(Self {
            path,
            project: caps["project"].to_string(),
            file: caps["file"].to_string(),
            name: caps["name"].to_string(),
            abi,
            code_hash,
        })
    }
}
