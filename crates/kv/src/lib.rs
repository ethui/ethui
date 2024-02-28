mod error;
mod init;

use std::collections::HashMap;
use std::fs::File;
use std::ops::Deref;
use std::path::PathBuf;

pub use error::{KvError, KvResult};
use serde::{de::DeserializeOwned, Serialize};

pub use init::init;

use self::init::KV_DIR;

#[derive(Debug, Default)]
pub struct Kv<K, V> {
    path: PathBuf,
    data: HashMap<K, V>,
}

impl<K, V> Deref for Kv<K, V>
where
    K: Serialize + DeserializeOwned,
    V: Serialize + DeserializeOwned,
{
    type Target = HashMap<K, V>;
    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

impl<K, V> Kv<K, V>
where
    K: Serialize + DeserializeOwned,
    V: Serialize + DeserializeOwned,
{
    pub fn open(path: PathBuf) -> Self {
        Kv {
            path,
            data: HashMap::new(),
        }
    }

    pub fn save(&self) -> KvResult<()> {
        let file = File::create(KV_DIR.get().unwrap().join(&self.path))?;

        serde_json::to_writer_pretty(file, &self.data)?;

        Ok(())
    }
}
