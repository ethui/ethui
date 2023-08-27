use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

use iron_types::Affinity;
use serde::{Deserialize, Serialize};

use crate::Result;

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Store {
    #[serde(skip, default)]
    pub(crate) file: PathBuf,

    // maps rule -> current_chain_id
    // rule is currently a domain, but may eventually grow
    // TODO: removing networks will cause some affinities to become invalid. need to clean them up
    pub(crate) affinities: HashMap<String, Affinity>,
}

impl Store {
    pub fn get_affinity(&self, domain: &str) -> Affinity {
        self.affinities.get(domain).cloned().unwrap_or_default()
    }

    pub fn set_affinity(&mut self, domain: &str, affinity: Affinity) -> Result<()> {
        match affinity {
            Affinity::Unset => self.affinities.remove(domain),
            affinity => self.affinities.insert(domain.to_string(), affinity),
        };
        self.save()?;

        Ok(())
    }

    // Persists current state to disk
    fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }
}
