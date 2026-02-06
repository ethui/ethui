use std::{ffi::OsStr, fs::File, io::BufReader, path::PathBuf};

use ethui_types::prelude::*;
use kameo::Reply;

/// Directories to ignore when processing artifacts
const IGNORED_ARTIFACT_DIRS: &[&str] = &["node_modules", "dependencies", "lib"];

#[derive(Debug, Clone, Reply, Serialize, Deserialize)]
pub struct SolArtifact {
    pub path: PathBuf,
    pub project: String,
    pub solidity_file: String,
    pub name: String,
    pub code: Bytes,
    pub abi: serde_json::Value,
    pub method_identifiers: serde_json::Value,
}

impl TryFrom<PathBuf> for SolArtifact {
    type Error = ();

    fn try_from(path: PathBuf) -> std::result::Result<Self, Self::Error> {
        use std::path::Component;

        if !path.exists() {
            return Err(());
        }

        // ignore non-json files
        if path.extension().is_none_or(|p| p != "json") {
            return Err(());
        }

        let path_str = path.to_string_lossy();

        // only process files in output directories
        if !path_str.contains("/out/") && !path_str.contains("/artifacts/") {
            return Err(());
        }

        // ignore files in dependency directories
        if IGNORED_ARTIFACT_DIRS
            .iter()
            .any(|dir| path_str.contains(&format!("/{}/", dir)))
        {
            return Err(());
        }

        let mut components = path.components().rev();

        // fetch contract name (without .json extension)
        let name: String = match components.next() {
            Some(Component::Normal(name)) => os_str_to_string(name)?
                .strip_suffix(".json")
                .map(|p| p.to_string())
                .ok_or(())?,
            _ => return Err(()),
        };

        // parent is solidity file name
        let solidity_file = match components.next() {
            Some(Component::Normal(file)) => os_str_to_string(file)?,
            _ => return Err(()),
        };

        // grandparent is the out dir itself
        let _out = components.next();

        // grand-grandparent is the project name
        let project = match components.next() {
            Some(Component::Normal(file)) => os_str_to_string(file)?,
            _ => return Err(()),
        };

        let file = File::open(path.clone()).unwrap();

        let json: serde_json::Value =
            serde_json::from_reader(BufReader::new(file)).map_err(|_| ())?;

        let abi = json["abi"].clone();

        let code = json["deployedBytecode"]["object"]
            .as_str()
            .or_else(|| json["deployedBytecode"].as_str())
            .and_then(|byte_code| Bytes::from_str(byte_code).ok())
            .ok_or(())?;

        let method_identifiers = json["methodIdentifiers"].clone();

        if abi.is_null() {
            return Err(());
        }

        Ok(Self {
            path,
            project,
            solidity_file,
            name,
            abi,
            method_identifiers,
            code,
        })
    }
}

impl TryFrom<notify::Event> for SolArtifact {
    type Error = ();

    fn try_from(event: notify::Event) -> Result<Self, Self::Error> {
        use notify::EventKind;

        // Skip events with no paths
        if event.paths.is_empty() {
            return Err(());
        }

        match event.kind {
            EventKind::Access(_) => Err(()),
            _ => event.paths[0].clone().try_into(),
        }
    }
}

fn os_str_to_string(s: &OsStr) -> std::result::Result<String, ()> {
    Ok(s.to_str().ok_or(())?.to_string())
}
