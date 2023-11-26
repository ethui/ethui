use std::path::Path;

use color_eyre::eyre::Result;
use reth_db::open_db_read_only;
use reth_primitives::SEPOLIA;
use reth_provider::ProviderFactory;

pub fn get_reth_factory(
    path: &Path,
    chain_id: u64,
) -> Result<ProviderFactory<reth_db::DatabaseEnv>> {
    let db = open_db_read_only(path, None)?;

    let spec = (*SEPOLIA).clone();
    let factory: ProviderFactory<reth_db::DatabaseEnv> = ProviderFactory::new(db, spec);

    Ok(factory)
}
