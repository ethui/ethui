use std::time::Duration;

use ethers::providers::{
    Http, HttpRateLimitRetryPolicy, Middleware, Provider, RetryClient, RetryClientBuilder,
};
use ethui_types::{events::Tx, Address, ToAlloy, ToEthers, TokenMetadata, U256, U64};
use serde::{Deserialize, Serialize};
use serde_json::json;
use url::Url;

use crate::{
    networks,
    types::{AlchemyAssetTransfer, Erc20Metadata, ErcMetadataResponse, ErcOwnersResponse},
    Error, Result,
};

#[derive(Debug)]
pub(crate) struct Client {
    v2_provider: Provider<RetryClient<Http>>,
    nft_v3_endpoint: Url,
}

pub(crate) enum Direction {
    From(Address),
    To(Address),
}

impl Client {
    pub fn new(chain_id: u32, api_key: &str) -> Result<Self> {
        let v2_provider = {
            let endpoint = networks::get_endpoint(chain_id, "v2/", api_key)?;
            let http = Http::new(endpoint);
            let policy = Box::<HttpRateLimitRetryPolicy>::default();

            let res = RetryClientBuilder::default()
                .rate_limit_retries(10)
                .timeout_retries(3)
                .initial_backoff(Duration::from_millis(500))
                .compute_units_per_second(300)
                .build(http, policy);

            Provider::new(res)
        };

        let nft_v3_endpoint = networks::get_endpoint(chain_id, "nft/v3/", api_key)?;

        Ok(Self {
            v2_provider,
            nft_v3_endpoint,
        })
    }

    pub async fn get_block_number(&self) -> Result<U64> {
        let block = self.v2_provider.get_block_number().await?;
        Ok(block.to_alloy())
    }

    pub async fn get_asset_transfers(
        &self,
        addr: Direction,
        from_block: U64,
        latest: U64,
    ) -> Result<(Vec<Tx>, Vec<TokenMetadata>)> {
        let mut params = json!({
            "fromBlock": format!("0x{:x}", from_block),
            "toBlock": format!("0x{:x}",latest),
            "maxCount": "0x32",
            "category": [ "external", "internal", "erc20", "erc721", "erc1155", "specialnft"],
        });

        let params_obj = params.as_object_mut().unwrap();

        match addr {
            Direction::From(addr) => params_obj.insert("fromAddress".to_string(), json!(addr)),
            Direction::To(addr) => params_obj.insert("toAddress".to_string(), json!(addr)),
        };

        #[derive(Debug, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        pub(super) struct AssetTransfers {
            transfers: Vec<AlchemyAssetTransfer>,
        }

        let req: AssetTransfers = self
            .v2_provider
            .request("alchemy_getAssetTransfers", json!([params]))
            .await?;

        let txs: Vec<Tx> = req.transfers.iter().map(Into::into).collect();
        let erc20_metadatas: Vec<TokenMetadata> = req
            .transfers
            .iter()
            .filter_map(|t| t.try_into().ok())
            .collect();

        Ok((txs, erc20_metadatas))
    }

    pub async fn get_native_balance(&self, address: Address) -> Result<U256> {
        Ok(self
            .v2_provider
            .get_balance(address.to_ethers(), None)
            .await
            .map(|x| x.to_alloy())?)
    }

    pub async fn get_erc20_balances(&self, address: Address) -> Result<Vec<(Address, U256)>> {
        #[derive(Debug, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Balances {
            pub address: Address,
            pub token_balances: Vec<TokenBalance>,
        }

        #[derive(Debug, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct TokenBalance {
            pub contract_address: Address,
            pub token_balance: U256,
        }

        impl From<TokenBalance> for (Address, U256) {
            fn from(value: TokenBalance) -> Self {
                (value.contract_address, value.token_balance)
            }
        }

        let params = json!([format!("0x{:x}", address), "erc20"]);
        let res: Balances = self
            .v2_provider
            .request("alchemy_getTokenBalances", params)
            .await?;

        Ok(res.token_balances.into_iter().map(Into::into).collect())
    }

    pub async fn get_erc20_metadata(&self, address: Address) -> Result<Erc20Metadata> {
        let params = json!([format!("0x{:x}", address)]);
        let response: Erc20Metadata = self
            .v2_provider
            .request("alchemy_getTokenMetadata", params)
            .await?;
        Ok(response)
    }

    pub async fn get_erc721_metadata(
        &self,
        address: Address,
        token_id: U256,
    ) -> Result<ErcMetadataResponse> {
        let path = format!(
            "{}/getNFTMetadata?contractAddress={}&tokenId={}&tokenType=ERC721&refreshCache=false",
            self.nft_v3_endpoint, address, token_id
        );
        let response = reqwest::get(&path)
            .await
            .map_err(|_e| Error::ErcInvalid)?
            .text()
            .await
            .map_err(|_e| Error::ErcInvalid)?;

        let response_json: ErcMetadataResponse =
            serde_json::from_str(&response).map_err(|_e| Error::ErcInvalid)?;

        Ok(response_json)
    }

    pub async fn get_erc721_owners(
        &self,
        address: Address,
        token_id: U256,
    ) -> Result<ErcOwnersResponse> {
        let path = format!(
            "{}/getOwnersForNFT?contractAddress={}&tokenId={}",
            self.nft_v3_endpoint, address, token_id
        );
        let response = reqwest::get(&path)
            .await
            .map_err(|_e| Error::ErcInvalid)?
            .text()
            .await
            .map_err(|_e| Error::ErcInvalid)?;

        let response_json: ErcOwnersResponse =
            serde_json::from_str(&response).map_err(|_e| Error::ErcInvalid)?;

        Ok(response_json)
    }
}
