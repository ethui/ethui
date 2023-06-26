use std::str::FromStr;

use ethers::{
    providers::{Http, Middleware, Provider, RetryClient},
    types::H256,
};

use super::{types::Transfer, Error, Result};
use crate::{
    db::DB,
    foundry::calculate_code_hash,
    types::{
        events::{ContractDeployed, Tx},
        Event,
    },
};

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
        let code_hash = client
            .get_code(address, None)
            .await
            .ok()
            .map(|v| calculate_code_hash(&v.to_string()).to_string());

        res.push(ContractDeployed { address, code_hash }.into())
    };

    Ok(res)
}
