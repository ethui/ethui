use std::path::{Path, PathBuf};

use once_cell::sync::OnceCell;

use crate::KvResult;

pub(crate) static KV_DIR: OnceCell<PathBuf> = OnceCell::new();

pub fn init(path: &Path) -> KvResult<()> {
    KV_DIR.set(path.to_path_buf()).unwrap();
    Ok(())
}
