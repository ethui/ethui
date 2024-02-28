mod alchemy2;
mod client;
mod error;
mod init;
mod networks;
mod types;
mod utils;

pub use alchemy2::fetch_transactions;

// use ethers::providers::Middleware;
// use futures::{stream, StreamExt};
// pub use init::init;
// use iron_types::{Address, Event, SyncUpdates, ToAlloy, ToEthers, U256};
// use serde_json::json;
// use tracing::{instrument, trace};
// use types::{AlchemyAssetTransfers, Balances};

// use crate::client::Client;

pub use self::error::{Error, Result};
pub use init::init;
pub use networks::supports_network;
pub use utils::get_current_api_key;

#[derive(Debug, Default)]
pub struct Alchemy {
    api_key: Option<String>,
}

// impl Alchemy {
//     pub fn new(api_key: Option<String>) -> Self {
//         Self { api_key }
//     }
//
//     pub fn set_api_key(&mut self, api_key: Option<String>) {
//         self.api_key = api_key;
//     }
//
//     #[instrument(skip(self))]
//     pub async fn fetch_updates(
//         &self,
//         chain_id: u32,
//         addr: Address,
//         from_block: Option<u64>,
//     ) -> Result<SyncUpdates> {
//         let (events, tip) = self.fetch_transactions(chain_id, addr, from_block).await?;
//         let balances = self.fetch_erc20_balances(chain_id, addr).await?;
//         let native_balance = self.fetch_native_balance(chain_id, addr).await?;
//
//         Ok(SyncUpdates {
//             events: Some(events),
//             erc20_balances: Some(balances),
//             native_balance: Some(native_balance),
//             tip,
//         })
//     }
//
//     /// fetches ERC20 balances for a user/chain_id
//     /// updates the DB, and notifies the UI
//     async fn fetch_erc20_balances(
//         &self,
//         chain_id: u32,
//         address: Address,
//     ) -> Result<Vec<(Address, U256)>> {
//         let client = networks::get_client(chain_id, &self.api_key).await?;
//
//         let res: Balances = client
//             .request(
//                 "alchemy_getTokenBalances",
//                 [&format!("0x{:x}", address), "erc20"],
//             )
//             .await?;
//         let balances: Vec<(Address, U256)> =
//             res.token_balances.into_iter().map(Into::into).collect();
//
//         // TODO: this should be done by a separate worker on iron_sync
//         utils::fetch_erc20_metadata(balances.clone(), client, chain_id).await?;
//
//         Ok(balances)
//     }
//
//     async fn fetch_native_balance(&self, chain_id: u32, address: Address) -> Result<U256> {
//         let client = networks::get_client(chain_id, &self.api_key).await?;
//
//         Ok(client
//             .get_balance(address.to_ethers(), None)
//             .await?
//             .to_alloy())
//     }
//
//     async fn fetch_transactions(
//         &self,
//         chain_id: u32,
//         addr: Address,
//         from_block: Option<u64>,
//     ) -> Result<(Vec<Event>, Option<u64>)> {
//         let client = Client::new(chain_id, &self.api_key.unwrap())?;
//
//         let from_block = from_block.unwrap_or_else(|| networks::default_from_block(chain_id));
//         let latest = client.get_block_number().await?;
//
//         // if tip - 1 == latest, we're up to date, nothing to do
//         if from_block.saturating_sub(1) == latest.as_u64() {
//             return Ok(Default::default());
//         }
//
//         let params = json!([{
//             "fromBlock": format!("0x{:x}", from_block),
//             "toBlock": format!("0x{:x}",latest),
//             "maxCount": "0x32",
//             "fromAddress": format!("0x{:x}", addr),
//             "category": ["external", "internal", "erc20", "erc721", "erc1155"],
//         }]);
//
//         dbg!("outgoing");
//         let outgoing: AlchemyAssetTransfers = (client
//             .request("alchemy_getAssetTransfers", params.clone())
//             .await)?;
//         dbg!("incoming");
//         let incoming: AlchemyAssetTransfers =
//             (client.request("alchemy_getAssetTransfers", params).await)?;
//
//         trace!(
//             event = "fetched",
//             count = outgoing.transfers.len() + incoming.transfers.len()
//         );
//
//         // maps over each request, parsing events out of each and flattening everything into a
//         // final result
//         let events: Vec<Event> =
//             stream::iter(outgoing.transfers.into_iter().chain(incoming.transfers))
//                 .then(|transfer| async { utils::transfer_into_tx(transfer, &client).await })
//                 .collect::<Vec<Result<Vec<_>>>>()
//                 .await
//                 .into_iter()
//                 .collect::<Result<Vec<Vec<Event>>>>()
//                 .map(|v| v.into_iter().flatten().collect())?;
//
//         trace!(event = "fetched events", count = events.len());
//
//         if events.is_empty() {
//             return Ok(Default::default());
//         }
//
//         let tip = events.iter().map(|tx| tx.block_number()).max();
//
//         Ok((events, tip))
//     }
// }
