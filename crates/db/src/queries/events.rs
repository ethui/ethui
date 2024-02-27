use iron_types::Event;
use tracing::{instrument, trace};

use crate::{Result, DB};

impl DB {
    #[instrument(level = "trace", skip(self, events))]
    pub async fn save_events(&self, chain_id: u32, events: Vec<Event>) -> Result<()> {
        let mut conn = self.tx().await?;

        for tx in events.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(ref tx) => {
                    trace!(tx = tx.hash.to_string());

                    super::insert_transaction(tx, chain_id)
                        .execute(&mut *conn)
                        .await?;
                }

                Event::ContractDeployed(ref tx) => {
                    trace!(contract = tx.address.to_string());

                    super::insert_contract(tx, chain_id)
                        .execute(&mut *conn)
                        .await?;
                }

                // TODO: what to do if we don't know this contract, and don't have balances yet? (e.g. in a fork)
                Event::ERC20Transfer(transfer) => {
                    trace!(
                        from = transfer.from.to_string(),
                        to = transfer.to.to_string(),
                        value = transfer.value.to_string()
                    );
                    // update from's balance
                    if !transfer.from.is_zero() {
                        let current =
                            super::erc20_read_balance(transfer.contract, transfer.from, chain_id)
                                .fetch_one(&mut *conn)
                                .await?;

                        super::erc20_update_balance(
                            transfer.contract,
                            transfer.from,
                            chain_id,
                            current - transfer.value,
                        )
                        .execute(&mut *conn)
                        .await?;
                    }

                    // update to's balance
                    if !transfer.to.is_zero() {
                        let current =
                            super::erc20_read_balance(transfer.contract, transfer.to, chain_id)
                                .fetch_one(&mut *conn)
                                .await
                                .unwrap_or_default();

                        super::erc20_update_balance(
                            transfer.contract,
                            transfer.to,
                            chain_id,
                            current + transfer.value,
                        )
                        .execute(&mut *conn)
                        .await?;
                    }
                }
                Event::ERC721Transfer(ref transfer) => {
                    trace!(
                        from = transfer.from.to_string(),
                        to = transfer.to.to_string(),
                        id = transfer.token_id.to_string()
                    );
                    super::erc721_transfer(transfer, chain_id)
                        .execute(&mut *conn)
                        .await?;
                }
            }
        }
        conn.commit().await?;
        Ok(())
    }
}
