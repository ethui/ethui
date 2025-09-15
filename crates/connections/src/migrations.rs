use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use ethui_types::Affinity;
use serde::{Deserialize, Serialize};
use serde_constant::ConstI64;
use serde_json::json;

use crate::{store::SerializedStore, Store};

pub type LatestVersion = ConstI64<2>;

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum Versions {
    V0(SerializedStoreV0),
    V1(SerializedStoreV1),
    V2(SerializedStore),
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedStoreV0 {
    affinities: HashMap<String, AffinityV0>,
    version: ConstI64<0>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedStoreV1 {
    affinities: HashMap<String, AffinityV0>,
    version: ConstI64<1>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AffinityV0 {
    #[default]
    Unset,
    Global,
    Sticky(u32),
}

pub(crate) fn load_and_migrate(pathbuf: &PathBuf) -> color_eyre::Result<Store> {
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
        Versions::V0(v0) => run_migrations(Versions::V1(SerializedStoreV1 {
            affinities: v0.affinities,
            version: ConstI64,
        })),
        Versions::V1(v1) => SerializedStore {
            affinities: migrate_affinities_from_v1_to_v2(v1.affinities),
            version: ConstI64,
        },
        Versions::V2(latest) => latest,
    }
}

fn migrate_affinities_from_v1_to_v2(
    affinities: HashMap<String, AffinityV0>,
) -> HashMap<String, Affinity> {
    affinities
        .into_iter()
        .map(|(domain, affinity)| match affinity {
            AffinityV0::Sticky(chain_id) => (domain, Affinity::Sticky((chain_id, 0u32).into())),
            AffinityV0::Unset => (domain, Affinity::Unset),
            AffinityV0::Global => (domain, Affinity::Global),
        })
        .collect::<HashMap<String, Affinity>>()
}

#[cfg(test)]
mod tests {
    use std::{
        fs::File,
        io::{BufReader, Write},
    };

    use ethui_types::Affinity;
    use serde_json::json;
    use tempfile::NamedTempFile;

    use super::load_and_migrate;
    use crate::store::SerializedStore;

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

        write!(tempfile, "{store_v0}").unwrap();

        if let Ok(_store) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_store: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_store["version"], 2);
        }
    }

    #[test]
    fn it_returns_v2_from_v2() {
        let mut tempfile = NamedTempFile::new().unwrap();
        let store = json!({
            "version": 2,
            "affinities": {
                "chainlist.org": "global",
                "etherscan.io": "global",
                "localhost": {
                    "sticky": 313337
                },
            }
        });

        write!(tempfile, "{store}").unwrap();

        if let Ok(_store) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_store: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_store["version"], 2);
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

        write!(tempfile, "{store_v0}").unwrap();

        let result = load_and_migrate(&tempfile.path().to_path_buf());

        assert!(result.is_err());
    }

    #[test]
    fn it_migrates_affinities_to_include_internal_id() {
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

        write!(tempfile, "{store_v0}").unwrap();

        if let Ok(_store) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_store: SerializedStore = serde_json::from_reader(reader).unwrap();
            let localhost = updated_store.affinities.get("localhost").unwrap();

            assert_eq!(localhost, &Affinity::Sticky((313337u32, 0u32).into()));
        }
    }
}
