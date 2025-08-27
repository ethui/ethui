use alloy::{
    network::Ethereum,
    providers::{ext::AnvilApi, Provider, ProviderBuilder, RootProvider},
    rpc::{client::ClientBuilder, types::anvil::ForkedNetwork},
    transports::layers::RetryBackoffLayer,
};
use tracing::instrument;
use url::Url;

use crate::{prelude::*, DedupChainId};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Network {
    pub dedup_chain_id: DedupChainId,
    pub name: String,
    pub explorer_url: Option<String>,
    pub http_url: Url,
    pub ws_url: Option<Url>,
    pub currency: String,
    pub decimals: u32,

    #[serde(default)]
    pub status: NetworkStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NetworkStatus {
    #[default]
    Unknown,
    Online,
    Offline,
}

impl Network {
    pub fn mainnet(deduplication_id: i32) -> Self {
        Self {
            dedup_chain_id: (1, deduplication_id).into(),
            name: String::from("Mainnet"),
            explorer_url: Some(String::from("https://etherscan.io/search?q=")),
            http_url: Url::parse("https://eth.llamarpc.com").unwrap(),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            status: Default::default(),
        }
    }

    pub fn sepolia(deduplication_id: i32) -> Self {
        Self {
            dedup_chain_id: (11155111, deduplication_id).into(),
            name: String::from("Sepolia"),
            explorer_url: Some(String::from("https://sepolia.etherscan.io/search?q=")),
            http_url: Url::parse("https://ethereum-sepolia-rpc.publicnode.com").unwrap(),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            status: Default::default(),
        }
    }

    pub fn anvil(deduplication_id: i32) -> Self {
        Self {
            dedup_chain_id: (31337, deduplication_id).into(),
            name: String::from("Anvil"),
            explorer_url: None,
            http_url: Url::parse("http://localhost:8545").unwrap(),
            ws_url: Some(Url::parse("ws://localhost:8545").unwrap()),
            currency: String::from("ETH"),
            decimals: 18,
            status: Default::default(),
        }
    }

    pub fn all_default() -> Vec<Self> {
        vec![Self::anvil(0), Self::mainnet(0), Self::sepolia(0)]
    }

    pub fn dedup_chain_id(&self) -> DedupChainId {
        self.dedup_chain_id
    }

    pub fn chain_id(&self) -> u32 {
        self.dedup_chain_id.chain_id()
    }

    pub fn chain_id_hex(&self) -> String {
        format!("0x{:x}", self.chain_id())
    }

    pub async fn is_dev(&self) -> bool {
        let provider = self.get_alloy_provider().await.unwrap();
        // TODO cache node_info for entire chain
        self.chain_id() == 31337 || provider.anvil_node_info().await.is_ok()
    }

    pub async fn get_forked_network(&self) -> color_eyre::Result<Option<ForkedNetwork>> {
        let provider = self.get_alloy_provider().await?;
        Ok(provider.anvil_metadata().await?.forked_network)
    }

    pub async fn get_alloy_provider(&self) -> color_eyre::Result<RootProvider<Ethereum>> {
        Ok(ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(self.http_url.as_str())
            .await?)
    }

    pub fn get_provider(&self) -> RootProvider<Ethereum> {
        let client = ClientBuilder::default()
            .layer(RetryBackoffLayer::new(10, 500, 300))
            .http(self.http_url.clone());

        ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect_client(client)
    }

    /// Polls the network status by attempting to get the chain ID and updates the status
    /// Returns the previous status if it changed, or the current status if unchanged
    #[instrument(level = "trace", skip(self), fields(chain_id = self.chain_id()))]
    pub async fn poll_status(&mut self) -> Option<NetworkStatus> {
        let new_status = if let Ok(provider) = self.get_alloy_provider().await
            && let Ok(_) = provider.get_chain_id().await
        {
            NetworkStatus::Online
        } else {
            NetworkStatus::Offline
        };

        if self.status != new_status {
            let old_status = self.status;
            self.status = new_status;
            Some(old_status)
        } else {
            None
        }
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id(), self.name)
    }
}
