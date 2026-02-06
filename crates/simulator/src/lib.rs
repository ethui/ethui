pub mod commands;
pub mod types;

use std::time::{SystemTime, UNIX_EPOCH};

use alloy::{
    eips::BlockId,
    providers::{Provider as _, ProviderBuilder},
};
use ethui_types::prelude::*;
use revm::{
    ExecuteEvm as _, MainBuilder as _, MainContext as _,
    context::{TxEnv, result::ExecResultAndState},
    database::{AlloyDB, CacheDB, WrapDatabaseAsync},
};
pub use types::{Request, SimResult};

/// Simulates a transaction on a given network's latest state.
pub async fn simulate_once(
    tx: Request,
    fork_url: String,
    fork_block_number: Option<u64>,
) -> Result<SimResult> {
    let provider = ProviderBuilder::new().connect(&fork_url).await?;
    let block_id: BlockId = fork_block_number.map(Into::into).unwrap_or_default();

    let nonce = provider
        .get_transaction_count(tx.from)
        .block_id(block_id)
        .await?;

    let block_number = provider.get_block_number().await?;
    let block_time = provider
        .get_block(block_number.into())
        .await?
        .map(|b| b.header.timestamp)
        .unwrap_or_default();
    let system_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let time = std::cmp::max(block_time, system_time);

    let db = WrapDatabaseAsync::new(AlloyDB::new(provider, block_id)).unwrap();
    let cache_db = CacheDB::new(db);

    let mut evm = revm::Context::mainnet()
        .with_db(cache_db)
        .modify_block_chained(|b| {
            b.timestamp = U256::from(time + 1);
            b.number = U256::from(block_number + 1);
        })
        .build_mainnet();

    let tx = TxEnv::builder()
        .caller(tx.from)
        .to(tx.to.unwrap_or_default())
        .data(tx.data.unwrap_or_default())
        .value(tx.value.unwrap_or_default())
        .nonce(nonce)
        .build()
        .unwrap();

    if let Ok(ExecResultAndState { result, .. }) = evm.transact(tx) {
        Ok(SimResult {
            success: result.is_success(),
            gas_used: result.gas_used(),
            logs: result.logs().to_vec(),
            return_data: result.output().cloned(),
        })
    } else {
        Err(eyre!("Failed to transact"))
    }
}
