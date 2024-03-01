use crate::{Error, Result};
use ethers::providers::Middleware;
use iron_types::events::Tx;
use iron_types::{GlobalState, ToAlloy, ToEthers, B256};

pub(crate) async fn fetch_full_tx(chain_id: u32, hash: B256) -> Result<()> {
    let networks = iron_networks::Networks::read().await;

    let provider = match networks.get_network(chain_id) {
        Some(network) => network.get_provider(),
        _ => return Err(Error::InvalidNetwork(chain_id)),
    };

    let tx = provider.get_transaction(hash.to_ethers()).await?;
    let receipt = provider.get_transaction_receipt(hash.to_ethers()).await?;

    dbg!(&tx, &receipt);
    if tx.is_none() || receipt.is_none() {
        return Err(Error::TxNotFound(hash));
    }

    let tx = tx.unwrap();
    let receipt = receipt.unwrap();

    let tx = Tx {
        hash,
        block_number: receipt.block_number.map(|b| b.as_u64()),
        from: tx.from.to_alloy(),
        to: tx.to.map(|a| a.to_alloy()),
        value: Some(tx.value.to_alloy()),
        data: Some(tx.input),
        position: Some(receipt.transaction_index.as_u64() as usize),
        status: receipt.status.unwrap().as_u64(),
        deployed_contract: None,
        incomplete: false,
    };

    let db = iron_db::get();
    dbg!(&tx);
    db.insert_transaction(chain_id, &tx).await?;

    Ok(())
}
