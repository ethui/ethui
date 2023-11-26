use color_eyre::eyre::{self};
use reth_db::open_db_read_only;
use reth_provider::ProviderFactory;

use crate::config::RethConfig;

impl TryFrom<&RethConfig> for ProviderFactory<reth_db::DatabaseEnv> {
    type Error = eyre::Error;

    fn try_from(config: &RethConfig) -> std::result::Result<Self, Self::Error> {
        let db = open_db_read_only(&config.db, None)?;

        let spec = match config.chain_id {
            1 => (*reth_primitives::MAINNET).clone(),
            11155111 => (*reth_primitives::SEPOLIA).clone(),
            _ => return Err(eyre::eyre!("unsupported chain id {}", config.chain_id)),
        };

        let factory: ProviderFactory<reth_db::DatabaseEnv> = ProviderFactory::new(db, spec);

        Ok(factory)
    }
}
