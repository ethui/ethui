use alloy::{
    eips::BlockId,
    network::Ethereum,
    providers::{
        fillers::{BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller},
        Identity, Provider as _, ProviderBuilder, RootProvider,
    },
};
// use foundry_evm::{
//     backend::Backend,
//     executors::{Executor, ExecutorBuilder},
//     fork::CreateFork,
//     opts::EvmOpts,
// };
use revm::{
    context::TxEnv,
    database::{AlloyDB, CacheDB, WrapDatabaseAsync},
    ExecuteEvm as _, MainBuilder as _, MainContext as _,
};

use crate::types::{Request, Result};

pub struct Evm {
    // executor: Executor,
    fork_url: String,
}

pub type AlloyCacheDB = CacheDB<WrapDatabaseAsync<AlloyDB<Ethereum, RevmProvider>>>;

pub type RevmProvider = FillProvider<
    JoinFill<
        Identity,
        JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
    >,
    RootProvider,
>;

pub fn init_cache_db(provider: RevmProvider) -> AlloyCacheDB {
    CacheDB::new(WrapDatabaseAsync::new(AlloyDB::new(provider, Default::default())).unwrap())
}

// https://pawelurbanek.com/revm-alloy-anvil-arbitrage

impl Evm {
    pub async fn new(
        fork_url: String,
        fork_block_number: Option<u64>,
        gas_limit: u64,
    ) -> color_eyre::Result<Self> {
        // let evm_opts = EvmOpts {
        //     fork_url: Some(fork_url.clone()),
        //     fork_block_number,
        //     env: foundry_evm::opts::Env {
        //         gas_limit: u64::MAX.into(),
        //         ..Default::default()
        //     },
        //     memory_limit: 1 << 27, // taken from foundry-config
        //     ..Default::default()
        // };
        //
        // let fork_opts = CreateFork {
        //     url: fork_url.clone(),
        //     enable_caching: true,
        //     env: evm_opts.evm_env().await.unwrap(),
        //     evm_opts,
        // };
        //
        // let db = Backend::spawn(Some(fork_opts.clone())).expect("Failed to spawn EVM backend");
        //
        // let executor = ExecutorBuilder::default()
        //     .gas_limit(gas_limit)
        //     .build(fork_opts.env, db);

        Ok(Evm { fork_url })
    }

    pub async fn call(&mut self, tx: Request) -> color_eyre::Result<Result> {
        let provider = ProviderBuilder::new().connect(&self.fork_url).await?;
        let provider2 = ProviderBuilder::new().connect(&self.fork_url).await?;
        let nonce = provider2.get_transaction_count(tx.from).await.unwrap();
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

        dbg!(evm.transact(tx));

        // .modify_tx_env(|tx| {
        //     tx.caller = tx.from;
        //     tx.origin = tx.to.unwrap_or_default();
        //     tx.data = tx.data.unwrap_or_default();
        //     tx.value = tx.value.unwrap_or_default();
        // });

        // let ref_tx = evm.transact().unwrap();
        // dbg!(&ref_tx);

        // let res = self.executor.call_raw(
        //     tx.from,
        //     tx.to.unwrap_or_default(),
        //     tx.data.unwrap_or_default(),
        //     tx.value.unwrap_or_default(),
        // )?;
        // dbg!(&res);

        todo!()
        // let traces = if let Some(traces) = res.traces {
        //     traces.nodes().to_vec()
        // } else {
        //     Vec::new() // Provide a default empty vector
        // };
        //
        // Ok(Result {
        //     gas_used: res.gas_used,
        //     block_number: res.env.evm_env.block_env.number,
        //     success: !res.reverted,
        //     traces,
        //     logs: res.logs,
        //     return_data: res.result.0.into(),
        // })
    }
}
