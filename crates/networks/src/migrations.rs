use ethui_types::Network;
use serde::{Deserialize, Serialize};
use serde_constant::ConstI64;
use serde_json::json;
use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use crate::Result;
use crate::{Networks, SerializedNetworks};

pub type LatestVersion = ConstI64<1>;

#[derive(Debug, Deserialize, Serialize)]
struct SerializedNetworksV0 {
    current: String,
    networks: HashMap<String, Network>,
    version: ConstI64<0>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum Versions {
    V0(SerializedNetworksV0),
    V1(SerializedNetworks),
}

pub(crate) fn load_and_migrate(pathbuf: &PathBuf) -> Result<Networks> {
    let path = Path::new(&pathbuf);
    let file = File::open(path)?;
    let reader = BufReader::new(&file);

    let mut networks: serde_json::Value = serde_json::from_reader(reader)?;

    if networks["version"].is_null() {
        networks["version"] = json!(0);
    }

    let networks: Versions = serde_json::from_value(networks)?;

    let networks = Networks {
        inner: run_migrations(networks),
        file: path.to_path_buf(),
    };

    networks.save()?;

    Ok(networks)
}

fn run_migrations(networks: Versions) -> SerializedNetworks {
    match networks {
        Versions::V0(v0) => SerializedNetworks {
            current: v0.current,
            networks: v0.networks,
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

        let networks_v0 = json!({
            "current": "Anvil",
            "networks": {
                "Mainnet": {
                    "name": "Mainnet",
                    "chain_id": 1,
                    "explorer_url": "https://etherscan.io/search?q=",
                    "http_url": "https://eth.llamarpc.com/",
                    "ws_url": null,
                    "currency": "ETH",
                    "decimals": 18
                },
            }
        });

        write!(tempfile, "{}", networks_v0).unwrap();

        if let Ok(_networks) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_networks: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_networks["version"], 1);
        }
    }

    #[test]
    fn it_returns_v1_from_v1() {
        let mut tempfile = NamedTempFile::new().unwrap();

        let networks_v0 = json!({
            "version": 1,
            "current": "Anvil",
            "networks": {
                "Mainnet": {
                    "name": "Mainnet",
                    "chain_id": 1,
                    "explorer_url": "https://etherscan.io/search?q=",
                    "http_url": "https://eth.llamarpc.com/",
                    "ws_url": null,
                    "currency": "ETH",
                    "decimals": 18
                },
            }
        });

        write!(tempfile, "{}", networks_v0).unwrap();

        if let Ok(_networks) = load_and_migrate(&tempfile.path().to_path_buf()) {
            let file = File::open(tempfile.path()).unwrap();
            let reader = BufReader::new(file);

            let updated_networks: serde_json::Value = serde_json::from_reader(reader).unwrap();
            assert_eq!(updated_networks["version"], 1);
        }
    }

    #[test]
    fn it_fails_for_unknown_version() {
        let mut tempfile = NamedTempFile::new().unwrap();

        let networks_v0 = json!({
            "version": "version",
            "current": "Anvil",
            "networks": {
                "Mainnet": {
                    "name": "Mainnet",
                    "chain_id": 1,
                    "explorer_url": "https://etherscan.io/search?q=",
                    "http_url": "https://eth.llamarpc.com/",
                    "ws_url": null,
                    "currency": "ETH",
                    "decimals": 18
                },
            }
        });

        write!(tempfile, "{}", networks_v0).unwrap();

        let result = load_and_migrate(&tempfile.path().to_path_buf());

        assert!(result.is_err());
    }
}
