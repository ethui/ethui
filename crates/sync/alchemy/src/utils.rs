use std::{str::FromStr, sync::Arc};

use ethers::providers::{Http, Middleware, Provider, RetryClient};
use iron_abis::IERC20;
use iron_db::Db;
use iron_types::{
    events::{ContractDeployed, Tx},
    Address, Event, ToAlloy, ToEthers, TokenMetadata, B256, U256,
};

use super::{types::Transfer, Error, Result};

pub(super) async fn transfer_into_tx(
    transfer: Transfer,
    client: &Provider<RetryClient<Http>>,
) -> Result<Vec<Event>> {
    let data = match transfer {
        Transfer::External(data) => data,
        Transfer::Internal(data) => data,
        Transfer::Erc20(data) => data,
        Transfer::Erc721(data) => data,
        Transfer::Erc1155(data) => data,
    };
    let block_number: u64 = data.block_num.try_into().unwrap();

    let hash = B256::from_str(data.unique_id.split(':').collect::<Vec<_>>()[0]).unwrap();

    let mut res = vec![];

    let tx = client
        .get_transaction(hash.to_ethers())
        .await?
        .ok_or(Error::TxNotFound(hash))?;
    let receipt = client
        .get_transaction_receipt(hash.to_ethers())
        .await?
        .ok_or(Error::TxNotFound(hash))?;

    if let Some(status) = receipt.status {
        res.push(
            Tx {
                hash,
                block_number,
                position: tx.transaction_index.map(|p| p.as_usize()),
                from: tx.from.to_alloy(),
                to: tx.to.map(ToAlloy::to_alloy),
                value: tx.value.to_alloy(),
                data: tx.input,
                status: status.as_u64(),
                deployed_contract: None,
            }
            .into(),
        );
    }

    if let Some(address) = receipt.contract_address {
        let code = client.get_code(address, None).await.ok();

        res.push(
            ContractDeployed {
                address: address.to_alloy(),
                code,
                block_number,
            }
            .into(),
        )
    };

    Ok(res)
}

pub(super) async fn fetch_erc20_metadata(
    balances: Vec<(Address, U256)>,
    client: Provider<RetryClient<Http>>,
    chain_id: u32,
    db: &Db,
) -> Result<()> {
    let client = Arc::new(client);

    for (address, _) in balances {
        if db.get_erc20_metadata(address, chain_id).await.is_err() {
            let contract = IERC20::new(address.to_ethers(), client.clone());

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
