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
use url::Url;

use crate::Result;
use crate::{Networks, SerializedNetworks};

pub type LatestVersion = ConstI64<2>;

#[derive(Debug, Deserialize, Serialize)]
struct SerializedNetworksV0 {
    current: String,
    networks: HashMap<String, NetworkV0>,
    version: ConstI64<0>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SerializedNetworksV1 {
    current: String,
    networks: HashMap<String, NetworkV0>,
    version: ConstI64<1>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum Versions {
    V0(SerializedNetworksV0),
    V1(SerializedNetworksV1),
    V2(SerializedNetworks),
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct NetworkV0 {
    pub name: String,
    pub chain_id: u32,
    pub explorer_url: Option<String>,
    pub http_url: Url,
    pub ws_url: Option<Url>,
    pub currency: String,
    pub decimals: u32,
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
        Versions::V0(v0) => {
            let v1 = Versions::V1(SerializedNetworksV1 {
                current: v0.current,
                networks: v0.networks,
                version: ConstI64,
            });

            run_migrations(v1)
        }
        Versions::V1(v1) => SerializedNetworks {
            current: v1.current,
            networks: migrate_networks_from_v1_to_v2(v1.networks),
            version: ConstI64,
        },
        Versions::V2(latest) => latest,
    }
}

fn migrate_networks_from_v1_to_v2(
    networks: HashMap<String, NetworkV0>,
) -> HashMap<String, Network> {
    networks
        .into_iter()
        .map(|(name, network)| {
            (
                name,
                Network {
                    // at the time of this migration no duplicate chain id were allowed
                    deduplication_id: 0,
                    name: network.name,
                    chain_id: network.chain_id,
                    explorer_url: network.explorer_url,
                    http_url: network.http_url,
                    ws_url: network.ws_url,
                    currency: network.currency,
                    decimals: network.decimals,
                },
            )
        })
        .collect::<HashMap<String, Network>>()
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use std::{
        fs::File,
        io::{BufReader, Write},
    };
    use tempfile::NamedTempFile;

    use crate::SerializedNetworks;

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
            assert_eq!(updated_networks["version"], 2);
        }
    }

    #[test]
    fn it_returns_v2_from_v2() {
        let mut tempfile = NamedTempFile::new().unwrap();

        let networks_v0 = json!({
            "version": 2,
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
            assert_eq!(updated_networks["version"], 2);
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

    #[test]
    fn it_migrates_network_to_include_internal_id() {
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

            let updated_networks: SerializedNetworks = serde_json::from_reader(reader).unwrap();
            let mainnet = updated_networks.networks.get("Mainnet").unwrap();

            assert_eq!(mainnet.internal_id(), (mainnet.chain_id, 0));
        }
    }
}
