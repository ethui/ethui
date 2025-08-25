use alloy::{
    network::Ethereum,
    providers::{ext::TraceApi as _, Provider as _, ProviderBuilder, RootProvider},
    rpc::types::Filter,
};
use ethui_types::{prelude::*, DedupChainId};
use url::Url;

use super::worker::Msg;
use crate::{
    expanders::{expand_logs, expand_traces},
    tracker::fetch_erc20_metadata,
};

pub trait Consumer: Send + Clone + 'static {
    fn process(
        &mut self,
        msg: Msg,
    ) -> impl std::future::Future<Output = color_eyre::Result<()>> + Send;
}

#[derive(Clone)]
pub struct EthuiConsumer {
    dedup_chain_id: DedupChainId,
    url: String,
    caught_up: bool,
}

impl EthuiConsumer {
    pub fn new(dedup_chain_id: DedupChainId, url: Url) -> Self {
        Self {
            dedup_chain_id,
            url: url.to_string(),
            caught_up: false,
        }
    }
}

impl Consumer for EthuiConsumer {
    async fn process(&mut self, msg: Msg) -> color_eyre::Result<()> {
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(&self.url)
            .await?;
        let db = ethui_db::get();

        match msg {
            Msg::Reset => {
                trace!(
                    "resetting {} {}",
                    self.dedup_chain_id.chain_id(),
                    self.dedup_chain_id.dedup_id()
                );
                db.truncate_events(self.dedup_chain_id).await.unwrap();
                self.caught_up = false;
            }
            Msg::CaughtUp => self.caught_up = true,
            Msg::Block(fixed_bytes) => {
                let traces = provider.trace_block(fixed_bytes.into()).await.unwrap();
                let trace_events = expand_traces(traces, &provider).await;

                let logs = provider
                    .get_logs(&Filter::new().select(fixed_bytes))
                    .await
                    .unwrap();
                let log_events = expand_logs(logs);

                db.save_events(self.dedup_chain_id, trace_events).await?;
                db.save_events(self.dedup_chain_id, log_events).await?;
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
        if self.caught_up {
            ethui_broadcast::ui_notify(UINotify::TxsUpdated).await;
            ethui_broadcast::ui_notify(UINotify::BalancesUpdated).await;
            ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
            ethui_broadcast::contract_found().await;
        }

        Ok(())
    }
}
