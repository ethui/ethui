use std::str::FromStr;

use ethers::{
    providers::{Http, Middleware, Provider},
    types::H256,
};

use super::{types::Transfer, Result};

pub(super) async fn transfer_into_tx(transfer: Transfer, client: &Provider<Http>) -> Result<()> {
    dbg!("here");
    let hash = H256::from_str(transfer.unique_id.split(":").collect::<Vec<_>>()[0]).unwrap();

    dbg!(hash);
    let receipt = client.get_transaction_receipt(hash).await?;
    dbg!(&receipt);

    Ok(())
    // todo!()
}
