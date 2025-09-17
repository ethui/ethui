use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

use ethui_types::{Affinity, NetworkId};
use serde::{Deserialize, Serialize};

use crate::migrations::LatestVersion;

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SerializedStore {
    // maps rule -> current_chain_id
    // rule is currently a domain, but may eventually grow
    // TODO: removing networks will cause some affinities to become invalid. need to clean them up
    pub(crate) affinities: HashMap<String, Affinity>,
    pub version: LatestVersion,
}

#[derive(Debug, Default)]
pub struct Store {
    pub(crate) file: PathBuf,

    pub(crate) inner: SerializedStore,
}

impl Store {
    pub fn get_affinity(&self, domain: &str) -> Affinity {
        self.inner
            .affinities
            .get(domain)
            .cloned()
            .unwrap_or_default()
    }

    pub fn set_affinity(&mut self, domain: &str, affinity: Affinity) -> color_eyre::Result<()> {
        match affinity {
            Affinity::Unset => self.inner.affinities.remove(domain),
            affinity => self.inner.affinities.insert(domain.to_string(), affinity),
        };
        self.save()?;

        Ok(())
    }

    // Persists current state to disk
    pub(crate) fn save(&self) -> color_eyre::Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, &self.inner)?;

        Ok(())
    }

    /// Whenever a chain is removed, we need to clear all affinities to that chain
    /// otherwise, new connections from the same website will fail
    pub(crate) fn on_chain_removed(&mut self, internal_id: NetworkId) {
        self.inner
            .affinities
            .retain(|_, affinity| *affinity != internal_id.into());
    }
}
