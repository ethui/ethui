use std::str::FromStr;

use ethers::{
    providers::{Http, Middleware, Provider},
    types::H256,
};

use crate::{
    foundry::calculate_code_hash,
    types::{
        events::{ContractDeployed, Tx},
        Event,
    },
};

use super::{types::Transfer, Error, Result};

pub(super) async fn transfer_into_tx(
    transfer: Transfer,
    client: &Provider<Http>,
) -> Result<Vec<Event>> {
    dbg!("here");
    let hash = H256::from_str(transfer.unique_id.split(":").collect::<Vec<_>>()[0]).unwrap();

    dbg!(hash);

    let tx = client
        .get_transaction(hash)
        .await?
        .ok_or(Error::TxNotFound(hash.into()))?;
    let receipt = client
        .get_transaction_receipt(hash)
        .await?
        .ok_or(Error::TxNotFound(hash.into()))?;

    let mut res = vec![Tx {
        hash,
        block_number: receipt.block_number.unwrap().as_u64(),
        position: tx.transaction_index.map(|p| p.as_usize()),
        from: tx.from,
        to: tx.to,
        value: tx.value,
        data: tx.input,
    }
    .into()];

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
