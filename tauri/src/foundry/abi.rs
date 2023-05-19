#![allow(dead_code)]

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::{fs::File, io::BufReader, path::PathBuf};

use regex::Regex;

#[derive(Debug, Clone)]
pub struct Abi {
    pub path: PathBuf,
    pub project: String,
    pub file: String,
    pub name: String,
    pub codehash: u64,
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

        let json: serde_json::Value = serde_json::from_reader(reader).unwrap();

        let abi = json["abi"].clone();
        let deployed_bytecode = json["deployedBytecode"]["object"].clone();

        if abi.is_null() || deployed_bytecode.is_null() {
            return Err(());
        }

        Ok(Self {
            path,
            project: caps["project"].to_string(),
            file: caps["file"].to_string(),
            name: caps["name"].to_string(),
            abi,
            codehash: calculate_codehash(&deployed_bytecode.to_string()),
        })
    }
}

pub(super) fn calculate_codehash<T: Hash>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}
