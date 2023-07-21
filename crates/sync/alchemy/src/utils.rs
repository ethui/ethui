use std::{str::FromStr, sync::Arc};

use ethers::{
    providers::{Http, Middleware, Provider, RetryClient},
    types::{Address, H256, U256},
};
use iron_abis::IERC20;
use iron_db::DB;
use iron_types::{
    events::{ContractDeployed, Tx},
    Event, TokenMetadata,
};

use super::{types::Transfer, Error, Result};

pub(super) async fn transfer_into_tx(
    transfer: Transfer,
    client: &Provider<RetryClient<Http>>,
    chain_id: u32,
    db: &DB,
) -> Result<Vec<Event>> {
    let data = match transfer {
        Transfer::External(data) => data,
        Transfer::Internal(data) => data,
        Transfer::Erc20(data) => data,
        Transfer::Erc721(data) => data,
        Transfer::Erc1155(data) => data,
    };

    let hash = H256::from_str(data.unique_id.split(':').collect::<Vec<_>>()[0]).unwrap();

    let mut res = vec![];
    if db.transaction_exists(chain_id, hash).await? {
        return Ok(res);
    }

    let tx = client
        .get_transaction(hash)
        .await?
        .ok_or(Error::TxNotFound(hash))?;
    let receipt = client
        .get_transaction_receipt(hash)
        .await?
        .ok_or(Error::TxNotFound(hash))?;

    res.push(
        Tx {
            hash,
            block_number: receipt.block_number.unwrap().as_u64(),
            position: tx.transaction_index.map(|p| p.as_usize()),
            from: tx.from,
            to: tx.to,
            value: tx.value,
            data: tx.input,
            status: receipt.status.unwrap().as_u64(),
        }
        .into(),
    );

    if let Some(address) = receipt.contract_address {
        let code = client.get_code(address, None).await.ok();

        res.push(ContractDeployed { address, code }.into())
    };

    Ok(res)
}

pub(super) async fn fetch_erc20_metadata(
    balances: Vec<(Address, U256)>,
    client: Provider<RetryClient<Http>>,
    chain_id: u32,
    db: &DB,
) -> Result<()> {
    let client = Arc::new(client);

    for (address, _) in balances {
        if db.get_erc20_metadata(address, chain_id).await.is_err() {
            let contract = IERC20::new(address, client.clone());

            let metadata = TokenMetadata {
                name: contract.name().call().await.unwrap_or_default(),
                symbol: contract.symbol().call().await.unwrap_or_default(),
                decimals: contract.decimals().call().await.unwrap_or_default(),
            };

            db.save_erc20_metadata(address, chain_id, metadata)
                .await
                .unwrap();
        }
    }

    Ok(())
}
