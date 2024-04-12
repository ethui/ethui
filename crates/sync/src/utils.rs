use ethers::providers::{Http, Middleware, Provider, RetryClient};
use ethui_abis::IERC20;
use ethui_types::{events::Tx, Address, GlobalState, ToAlloy, ToEthers, TokenMetadata, B256};

use crate::{Error, Result};

pub(crate) async fn fetch_full_tx(chain_id: u32, hash: B256) -> Result<()> {
    let provider = provider(chain_id).await?;

    let tx = provider.get_transaction(hash.to_ethers()).await?;
    let receipt = provider.get_transaction_receipt(hash.to_ethers()).await?;

    if tx.is_none() || receipt.is_none() {
        return Err(Error::TxNotFound(hash));
    }

    let tx = tx.unwrap();
    let receipt = receipt.unwrap();

    let tx = Tx {
        hash,
        trace_address: None,
        block_number: receipt.block_number.map(|b| b.as_u64()),
        from: tx.from.to_alloy(),
        to: tx.to.map(|a| a.to_alloy()),
        value: Some(tx.value.to_alloy()),
        data: Some(tx.input),
        position: Some(receipt.transaction_index.as_u64() as usize),
        status: receipt.status.unwrap().as_u64(),
        gas_limit: Some(tx.gas.to_alloy()),
        gas_used: receipt.gas_used.map(|g| g.to_alloy()),
        max_fee_per_gas: tx.max_fee_per_gas.map(|g| g.to_alloy()),
        max_priority_fee_per_gas: tx.max_priority_fee_per_gas.map(|g| g.to_alloy()),
        r#type: tx.transaction_type.map(|t| t.as_u64()),
        nonce: Some(tx.nonce.as_u64()),
        deployed_contract: None,
        incomplete: false,
    };

    let db = ethui_db::get();
    db.insert_transaction(chain_id, &tx).await?;

    Ok(())
}

pub(crate) async fn fetch_erc20_metadata(chain_id: u32, address: Address) -> Result<()> {
    let provider = provider(chain_id).await?;

    let contract = IERC20::new(address.to_ethers(), provider.into());

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

async fn provider(chain_id: u32) -> Result<Provider<RetryClient<Http>>> {
    let networks = ethui_networks::Networks::read().await;

    match networks.get_network(chain_id) {
        Some(network) => Ok(network.get_provider()),
        _ => Err(Error::InvalidNetwork(chain_id)),
    }
}
