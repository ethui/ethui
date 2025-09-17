use alloy::{
    providers::{ext::TraceApi as _, Provider as _, ProviderBuilder},
    rpc::types::Filter,
};
use ethui_types::{prelude::*, NetworkId};
use url::Url;

use super::worker::Msg;
use crate::{
    expanders::{expand_logs, expand_traces},
    utils::fetch_erc20_metadata,
};

pub trait Consumer: Send + Clone + 'static {
    fn process(
        &mut self,
        msg: Msg,
    ) -> impl std::future::Future<Output = color_eyre::Result<()>> + Send;
}

#[derive(Clone)]
pub struct EthuiConsumer {
    dedup_chain_id: NetworkId,
    url: String,
    caught_up: bool,
}

impl EthuiConsumer {
    pub fn new(dedup_chain_id: NetworkId, url: Url) -> Self {
        Self {
            dedup_chain_id,
            url: url.to_string(),
            caught_up: false,
        }
    }
}

impl From<Network> for EthuiConsumer {
    fn from(network: Network) -> Self {
        Self::new(network.id, network.http_url.clone())
    }
}

impl Consumer for EthuiConsumer {
    async fn process(&mut self, msg: Msg) -> color_eyre::Result<()> {
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(&self.url)
            .await?;
        let db = ethui_db::get();
        let mut notify = false;

        match msg {
            Msg::Reset => {
                trace!(
                    "resetting {} {}",
                    self.dedup_chain_id.chain_id(),
                    self.dedup_chain_id.dedup_id()
                );
                let _ = db.truncate_events(self.dedup_chain_id).await;
                notify = true;
            }
            Msg::CaughtUp => {
                self.caught_up = true;
                notify = true;
            }
            Msg::Block { hash, number } => {
                let traces = provider.trace_block(number.into()).await?;
                let trace_events = expand_traces(traces, &provider).await;

                let logs = provider.get_logs(&Filter::new().select(hash)).await?;
                let log_events = expand_logs(logs);

                db.save_events(self.dedup_chain_id, trace_events).await?;
                db.save_events(self.dedup_chain_id, log_events).await?;
                if self.caught_up {
                    notify = true;
                }
            }
        }

        for address in db
            .get_erc20_missing_metadata(self.dedup_chain_id.chain_id())
            .await?
            .into_iter()
        {
            let metadata = fetch_erc20_metadata(address, &provider).await;

            db.save_erc20_metadata(self.dedup_chain_id.chain_id(), metadata)
                .await
                .unwrap();
        }

        // don't emit events until we're catching up
        // otherwise we spam too much during that phase
        if notify {
            ethui_broadcast::ui_notify(UINotify::TxsUpdated).await;
            ethui_broadcast::ui_notify(UINotify::BalancesUpdated).await;
            ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
            ethui_broadcast::contract_found().await;
        }

        Ok(())
    }
}
