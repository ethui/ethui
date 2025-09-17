use ethui_types::{Event, NetworkId};
use tracing::instrument;

use crate::DbInner;

impl DbInner {
    #[instrument(level = "trace", skip(self, events))]
    pub async fn save_events(
        &self,
        dedup_chain_id: NetworkId,
        events: Vec<Event>,
    ) -> color_eyre::Result<()> {
        let chain_id = dedup_chain_id.chain_id();

        for tx in events.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(tx) => {
                    self.insert_transaction(chain_id, tx).await?;
                }

                Event::ContractDeployed(tx) => {
                    self.insert_contract_with_abi(
                        dedup_chain_id,
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
            }
        }
        Ok(())
    }
}
