use alloy::{
    consensus::{Transaction as _, TxType},
    network::{Ethereum, TransactionResponse as _},
    providers::{Provider as _, RootProvider},
};
use ethui_abis::IERC20;
use ethui_types::{TokenMetadata, events::Tx, prelude::*};

pub(crate) async fn fetch_full_tx(chain_id: u32, hash: B256) -> color_eyre::Result<()> {
    let provider = provider(chain_id).await?;

    let tx = provider.get_transaction_by_hash(hash).await?;
    let receipt = provider.get_transaction_receipt(hash).await?;

    if tx.is_none() || receipt.is_none() {
        return Err(eyre!("TX not found: {}", hash));
    }

    let tx = tx.unwrap();
    let receipt = receipt.unwrap();

    let tx = Tx {
        hash,
        trace_address: None,
        block_number: receipt.block_number,
        from: tx.from(),
        to: tx.to(),
        value: Some(tx.inner.value()),
        data: Some(tx.inner.input().clone()),
        position: receipt.transaction_index.map(|r| r as usize),
        status: if receipt.status() { 1 } else { 0 },
        gas_limit: Some(tx.inner.gas_limit()),
        gas_used: Some(receipt.gas_used as u64),
        max_fee_per_gas: tx.inner.as_eip1559().map(|t| t.tx().max_fee_per_gas),
        max_priority_fee_per_gas: tx.inner.as_eip1559().map(|t| t.tx().max_fee_per_gas),
        r#type: Some(<TxType as Into<u8>>::into(tx.inner.tx_type()) as u64),
        nonce: Some(tx.inner.nonce()),
        deployed_contract: None,
        incomplete: false,
    };

    let db = ethui_db::get();
    db.insert_transaction(chain_id, &tx).await?;

    Ok(())
}

pub(crate) async fn fetch_erc20_metadata(
    chain_id: u32,
    address: Address,
) -> color_eyre::Result<()> {
    let provider = provider(chain_id).await?;

    let contract = IERC20::new(address, provider);

    let metadata = TokenMetadata {
        address,
        name: contract.name().call().await.ok(),
        symbol: contract.symbol().call().await.ok(),
        decimals: contract.decimals().call().await.ok(),
    };

    let db = ethui_db::get();
    db.save_erc20_metadatas(chain_id, vec![metadata])
        .await
        .unwrap();

    Ok(())
}

async fn provider(chain_id: u32) -> color_eyre::Result<RootProvider<Ethereum>> {
    let networks = ethui_networks::Networks::read().await;

    match networks.get_network(chain_id) {
        Some(network) => Ok(network.get_alloy_provider().await?),
        _ => Err(eyre!("Invalid network: {}", chain_id)),
    }
}
