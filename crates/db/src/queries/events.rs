use ethui_types::Event;
use tracing::{instrument, trace};

use crate::{DbInner, Result};

impl DbInner {
    #[instrument(level = "trace", skip(self, events))]
    pub async fn save_events(&self, chain_id: u32, events: Vec<Event>) -> Result<()> {
        for tx in events.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(ref tx) => {
                    self.insert_transaction(chain_id, tx).await?;
                }

                Event::ContractDeployed(ref tx) => {
                    self.insert_contract_with_abi(
                        chain_id,
                        tx.address,
                        tx.code.as_ref(),
                        None,
                        None,
                        tx.proxy_for,
                    )
                    .await?;
                }

                // TODO: what to do if we don't know this contract, and don't have balances yet? (e.g. in a fork)
                Event::ERC20Transfer(transfer) => {
                    self.process_erc20_transfer(
                        chain_id,
                        transfer.contract,
                        transfer.from,
                        transfer.to,
                        transfer.value,
                    )
                    .await?;
                }
                Event::ERC721Transfer(ref transfer) => {
                    trace!(
                        from = transfer.from.to_string(),
                        to = transfer.to.to_string(),
                        id = transfer.token_id.to_string()
                    );
                    self.process_erc721_transfer(
                        chain_id,
                        transfer.contract,
                        transfer.from,
                        transfer.to,
                        transfer.token_id,
                    )
                    .await?;
                }
            }
        }
        Ok(())
    }
}
