use ethui_types::Network;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs::File, io::BufReader, path::Path};

#[derive(Debug, Deserialize, Serialize)]
struct NetworksJson {
    #[serde(default = "default_version")]
    version: u32,
    current: String,
    networks: HashMap<String, Network>,
}

fn default_version() -> u32 {
    1
}

fn migrate_v1_to_v2(networks_json: NetworksJson) -> NetworksJson {
    // make the changes needed and update the version
    networks_json
}

fn run_migrations(networks_json: NetworksJson) -> NetworksJson {
    match networks_json.version {
        1 => run_migrations(migrate_v1_to_v2(networks_json)),
        _ => networks_json,
    }
}

pub(crate) fn load_and_migrate(path: &Path) {
    let file = File::open(path).unwrap();
    let reader = BufReader::new(file);

    let persisted_networks: NetworksJson = serde_json::from_reader(reader).unwrap();
    let file_version = persisted_networks.version;

    let persisted_networks = run_migrations(persisted_networks);

    if persisted_networks.version > file_version {
        let file = File::create(path).unwrap();
        serde_json::to_writer_pretty(file, &persisted_networks).unwrap();
    }
}
