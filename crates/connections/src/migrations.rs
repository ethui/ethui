use crate::Result;
use crate::{store::SerializedStore, Store};
use std::{collections::HashMap, fs::File, io::BufReader, path::Path, path::PathBuf};

use ethui_types::Affinity;
use serde::{Deserialize, Serialize};
use serde_constant::ConstI64;
use serde_json::json;

pub type LatestVersion = ConstI64<1>;

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum Versions {
    V0(SerializedStoreV0),
    V1(SerializedStore),
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedStoreV0 {
    affinities: HashMap<String, Affinity>,
    version: ConstI64<0>,
}

pub(crate) fn load_and_migrate(pathbuf: &PathBuf) -> Result<Store> {
    let path = Path::new(&pathbuf);
    let file = File::open(path)?;
    let reader = BufReader::new(&file);

    let mut store: serde_json::Value = serde_json::from_reader(reader)?;

    if store["version"].is_null() {
        store["version"] = json!(0);
    }

    let store: Versions = serde_json::from_value(store)?;

    let store = Store {
        inner: run_migrations(store),
        file: path.to_path_buf(),
    };

    store.save()?;

    Ok(store)
}

fn run_migrations(store: Versions) -> SerializedStore {
    match store {
        Versions::V0(v0) => SerializedStore {
            affinities: v0.affinities,
            version: ConstI64,
        },
        Versions::V1(latest) => latest,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use std::{
        fs::File,
        io::{BufReader, Write},
    };
    use tempfile::NamedTempFile;

    use super::load_and_migrate;

    #[test]
    fn it_converts_from_v0_to_v1() {
        let mut tempfile = NamedTempFile::new().unwrap();
        let store_v0 = json!({
            "affinities": {
                "chainlist.org": "global",
                "etherscan.io": "global",
                "localhost": {
                    "sticky": 313337
                },
            }
        });

        write!(tempfile, "{}", store_v0).unwrap();

        if let Ok(_store) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_store: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_store["version"], 1);
        }
    }

    #[test]
    fn it_returns_v1_from_v1() {
        let mut tempfile = NamedTempFile::new().unwrap();
        let store_v0 = json!({
            "version": 1,
            "affinities": {
                "chainlist.org": "global",
                "etherscan.io": "global",
                "localhost": {
                    "sticky": 313337
                },
            }
        });

        write!(tempfile, "{}", store_v0).unwrap();

        if let Ok(_store) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_store: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_store["version"], 1);
        }
    }

    #[test]
    fn it_fails_for_unknown_version() {
        let mut tempfile = NamedTempFile::new().unwrap();
        let store_v0 = json!({
            "version": "version",
            "affinities": {
                "chainlist.org": "global",
                "etherscan.io": "global",
                "localhost": {
                    "sticky": 313337
                },
            }
        });

        write!(tempfile, "{}", store_v0).unwrap();

        let result = load_and_migrate(&tempfile.path().to_path_buf());

        assert!(result.is_err());
    }
}
