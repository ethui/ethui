pub mod commands;
pub mod types;

use alloy::{
    eips::BlockId,
    providers::{Provider as _, ProviderBuilder},
};
use ethui_types::prelude::*;
use revm::{
    context::{result::ExecResultAndState, TxEnv},
    database::{AlloyDB, CacheDB, WrapDatabaseAsync},
    ExecuteEvm as _, MainBuilder as _, MainContext as _,
};
pub use types::{Request, SimResult};

/// Simulates a transaction on a given network's latest state.
pub async fn simulate_once(fork_url: String, tx: Request) -> color_eyre::Result<SimResult> {
    let provider = ProviderBuilder::new().connect(&fork_url).await?;
    let nonce = provider.get_transaction_count(tx.from).await.unwrap();

    let db = WrapDatabaseAsync::new(AlloyDB::new(provider, BlockId::latest())).unwrap();
    let cache_db = CacheDB::new(db);
    let mut evm = revm::Context::mainnet().with_db(cache_db).build_mainnet();

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
