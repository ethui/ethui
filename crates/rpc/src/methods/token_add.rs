use ethui_connections::Ctx;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_sync::{get_alchemy, Erc20Metadata, ErcMetadataResponse, ErcOwnersResponse};
use ethui_types::{prelude::*, TokenMetadata};
use ethui_wallets::{WalletControl, Wallets};
use jsonrpc_core::Params as RpcParams;
use serde::{Deserialize, Serialize};

use crate::{params::extract_single_param, rpc_request::Method, utils, Error, Result};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ERC20Options {
    address: Address,
    chain_id: Option<u64>,
    name: Option<String>,
    symbol: Option<String>,
    decimals: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ERC721Options {
    address: Address,
    chain_id: Option<u64>,
    token_id: U256,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ERC1155Options {
    address: Address,
    chain_id: Option<u64>,
    token_id: U256,
}

#[derive(Debug, Clone)]
pub(crate) enum TokenAdd {
    ERC20(ERC20Options),
    ERC721(ERC721Options),
    ERC1155(ERC1155Options),
}

impl TokenAdd {
    fn chain_id(&self) -> Option<u64> {
        match self {
            TokenAdd::ERC20(opts) => opts.chain_id,
            TokenAdd::ERC721(opts) => opts.chain_id,
            TokenAdd::ERC1155(opts) => opts.chain_id,
        }
    }

    fn token_type(&self) -> &'static str {
        match self {
            TokenAdd::ERC20(_) => "ERC20",
            TokenAdd::ERC721(_) => "ERC721",
            TokenAdd::ERC1155(_) => "ERC1155",
        }
    }
}

#[derive(Debug, Serialize, Clone)]
struct Erc20FullData {
    metadata: TokenMetadata,
    alchemy_metadata: Erc20Metadata,
}

impl Method for TokenAdd {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let value = extract_single_param(params);

        let type_value: Json = value
            .get("type")
            .ok_or(Error::TypeInvalid("Missing type field".to_string()))?
            .clone();
        let token_type: String = serde_json::from_value(type_value)?;

        match token_type.as_str() {
            "ERC20" => {
                let options_value: Json = value
                    .get("options")
                    .ok_or(Error::TypeInvalid(
                        "ERC20 type is missing options field".to_string(),
                    ))?
                    .clone();
                let options: ERC20Options = serde_json::from_value(options_value)?;
                Ok(TokenAdd::ERC20(options))
            }
            "ERC721" => {
                let options_value: Json = value
                    .get("options")
                    .ok_or(Error::TypeInvalid(
                        "ERC721 type is missing options field".to_string(),
                    ))?
                    .clone();
                let options: ERC721Options = serde_json::from_value(options_value)?;
                Ok(TokenAdd::ERC721(options))
            }
            "ERC1155" => {
                let options_value: Json = value
                    .get("options")
                    .ok_or(Error::TypeInvalid(
                        "ERC1155 type is missing options field".to_string(),
                    ))?
                    .clone();
                let options: ERC1155Options = serde_json::from_value(options_value)?;
                Ok(TokenAdd::ERC1155(options))
            }
            _ => Err(Error::TypeInvalid(token_type)),
        }
    }

    async fn run(self) -> Result<Json> {
        self.check_network().await?;

        let chain_id = self.get_current_chain_id().await;

        match &self {
            TokenAdd::ERC20(opts) => self.run_erc20(chain_id, opts.clone()).await?,
            TokenAdd::ERC721(opts) => self.run_erc721(chain_id, opts.clone()).await?,
            TokenAdd::ERC1155(opts) => self.run_erc1155(chain_id, opts.clone()).await?,
        }

        Ok(true.into())
    }
}

impl TokenAdd {
    async fn get_current_chain_id(&self) -> u64 {
        utils::get_current_network().await.chain_id()
    }

    async fn get_current_wallet_address(&self) -> Address {
        let wallets = Wallets::read().await;
        wallets.get_current_wallet().get_current_address().await
    }

    async fn get_erc20_metadata(&self, chain_id: u64, address: Address) -> Result<Erc20Metadata> {
        let alchemy = get_alchemy(chain_id).await.map_err(|_| Error::ParseError)?;
        let metadata = alchemy
            .fetch_erc20_metadata(address)
            .await
            .map_err(|_| Error::ParseError)?;
        Ok(metadata)
    }

    async fn get_erc_metadata(
        &self,
        chain_id: u64,
        address: Address,
        token_id: U256,
        token_type: &str,
    ) -> Result<ErcMetadataResponse> {
        let alchemy = get_alchemy(chain_id).await.map_err(|_| Error::ParseError)?;
        let metadata_response = alchemy
            .fetch_erc_metadata(address, token_id, token_type.to_string())
            .await
            .map_err(|_| Error::ParseError)?;
        Ok(metadata_response)
    }

    async fn get_erc_owners(&self, chain_id: u64, address: Address) -> Result<ErcOwnersResponse> {
        let alchemy = get_alchemy(chain_id).await.map_err(|_| Error::ParseError)?;
        let owners_response = alchemy
            .fetch_erc_owners(address)
            .await
            .map_err(|_| Error::ParseError)?;
        Ok(owners_response)
    }

    async fn get_erc1155_balances(
        &self,
        chain_id: u64,
        address: Address,
        token_id: U256,
    ) -> Result<U256> {
        let wallet_address = self.get_current_wallet_address().await;
        let balances_response = self.get_erc_owners(chain_id, address).await?;

        let owners: HashSet<String> = balances_response
            .owners
            .iter()
            .map(|owner| owner.owner_address.clone())
            .collect();

        if !owners.contains(&wallet_address.to_string()) {
            return Err(Error::ErcWrongOwner);
        }

        for owner in balances_response.owners {
            if owner.owner_address == wallet_address.to_string() {
                for token_balance in owner.token_balances {
                    if token_balance.token_id == token_id.to_string() {
                        let balance: U256 = token_balance
                            .balance
                            .parse()
                            .expect("Invalid number format");
                        return Ok(balance);
                    }
                }
            }
        }
        Err(Error::ErcInvalid)
    }

    fn set_erc20_metadata(
        &self,
        metadata: TokenMetadata,
        alchemy_metadata: &Erc20Metadata,
    ) -> TokenMetadata {
        // NOTE: metadata fetched from Alchemy is prioritized
        TokenMetadata {
            address: metadata.address,
            name: if alchemy_metadata.name == Some("".to_string()) {
                metadata.name
            } else {
                alchemy_metadata.name.clone()
            },
            symbol: if alchemy_metadata.symbol == Some("".to_string()) {
                metadata.symbol
            } else {
                alchemy_metadata.symbol.clone()
            },
            decimals: if (alchemy_metadata.decimals.is_none()
                || alchemy_metadata.decimals == Some(0))
                && (metadata.decimals.is_none() || metadata.decimals == Some(0))
            {
                Some(18)
            } else if alchemy_metadata.decimals.is_none() || alchemy_metadata.decimals == Some(0) {
                metadata.decimals
            } else {
                alchemy_metadata.decimals
            },
        }
    }

    async fn check_network(&self) -> Result<()> {
        let current_chain_id = self.get_current_chain_id().await;
        let chain_id = self.chain_id().unwrap_or(current_chain_id);
        if current_chain_id != chain_id {
            return Err(Error::NetworkInvalid);
        }
        Ok(())
    }

    fn check_erc20_metadata(
        &self,
        metadata: &TokenMetadata,
        alchemy_metadata: &Erc20Metadata,
    ) -> Result<()> {
        // NOTE: symbol is required for the token to be added
        if alchemy_metadata.symbol == Some("".to_string())
            && (metadata.symbol.is_none() || metadata.symbol == Some("".to_string()))
        {
            return Err(Error::SymbolMissing);
        } else if alchemy_metadata.symbol.as_ref().map(|s| s.len()).unwrap_or(0) > 11
            || metadata.symbol.as_ref().map(|s| s.len()).unwrap_or(0) > 11
        {
            return Err(Error::SymbolInvalid);
        } else if alchemy_metadata.decimals.unwrap_or(0) > 36 || metadata.decimals.unwrap_or(0) > 36
        {
            return Err(Error::DecimalsInvalid);
        }
        Ok(())
    }

    fn check_erc_type(&self, erc_data: &ErcMetadataResponse) -> Result<()> {
        let token_type = &erc_data.contract.token_type;
        if token_type != self.token_type() {
            return Err(Error::ErcTypeInvalid(
                self.token_type().to_string(),
                token_type.clone(),
            ));
        }
        Ok(())
    }

    async fn check_erc_owner(&self, chain_id: u64, address: Address) -> Result<()> {
        let wallet_address = self.get_current_wallet_address().await;
        let owners_response = self.get_erc_owners(chain_id, address).await?;

        let owners: HashSet<String> = owners_response
            .owners
            .iter()
            .map(|owner| owner.owner_address.clone())
            .collect();
        if !owners.contains(&wallet_address.to_string()) {
            Err(Error::ErcWrongOwner)
        } else {
            Ok(())
        }
    }

    async fn run_erc20(&self, chain_id: u64, opts: ERC20Options) -> Result<()> {
        let alchemy_metadata = self
            .get_erc20_metadata(chain_id, opts.address)
            .await
            .map_err(|_e| Error::TokenInvalid)?;

        let metadata = TokenMetadata {
            address: opts.address,
            name: opts.name,
            symbol: opts.symbol,
            decimals: opts.decimals,
        };

        self.check_erc20_metadata(&metadata, &alchemy_metadata)?;
        let final_metadata = self.set_erc20_metadata(metadata, &alchemy_metadata);

        let erc20_full_data = Erc20FullData {
            metadata: final_metadata.clone(),
            alchemy_metadata,
        };

        let dialog = Dialog::new("erc20-add", serde_json::to_value(&erc20_full_data).unwrap());
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        self.on_accept_erc20(chain_id, &erc20_full_data).await?;
                        break;
                    }
                }
                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(())
    }

    async fn run_erc721(&self, chain_id: u64, opts: ERC721Options) -> Result<()> {
        let erc721_full_data = self
            .get_erc_metadata(chain_id, opts.address, opts.token_id, "ERC721")
            .await
            .map_err(|_e| Error::TokenInvalid)?;

        self.check_erc_type(&erc721_full_data)?;
        self.check_erc_owner(chain_id, opts.address).await?;

        let dialog = Dialog::new(
            "erc721-add",
            serde_json::to_value(&erc721_full_data).unwrap(),
        );
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        self.on_accept_erc721(chain_id, &erc721_full_data).await?;
                        break;
                    }
                }
                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(())
    }

    async fn run_erc1155(&self, chain_id: u64, opts: ERC1155Options) -> Result<()> {
        let metadata_response = self
            .get_erc_metadata(chain_id, opts.address, opts.token_id, "ERC1155")
            .await
            .map_err(|_e| Error::TokenInvalid)?;

        self.check_erc_type(&metadata_response)?;
        self.check_erc_owner(chain_id, opts.address).await?;

        let balance = self
            .get_erc1155_balances(chain_id, opts.address, opts.token_id)
            .await?;

        let erc1155_full_data = ErcMetadataResponse {
            contract: metadata_response.contract,
            token_id: metadata_response.token_id,
            image: metadata_response.image,
            raw: metadata_response.raw,
            collection: metadata_response.collection,
            balance: Some(balance),
        };

        let dialog = Dialog::new(
            "erc1155-add",
            serde_json::to_value(&erc1155_full_data).unwrap(),
        );
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        self.on_accept_erc1155(chain_id, &erc1155_full_data).await?;
                        break;
                    }
                }
                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(())
    }

    async fn on_accept_erc20(&self, chain_id: u64, erc20_full_data: &Erc20FullData) -> Result<()> {
        let db = ethui_db::get();
        let wallet_address = self.get_current_wallet_address().await;
        let _save_metadata = db
            .save_erc20_metadata(chain_id, erc20_full_data.metadata.clone())
            .await;
        let _save_balance = db
            .save_erc20_balance(
                chain_id,
                erc20_full_data.metadata.address,
                wallet_address,
                U256::from(0),
            )
            .await;
        Ok(())
    }

    async fn on_accept_erc721(&self, chain_id: u64, full_data: &ErcMetadataResponse) -> Result<()> {
        let db = ethui_db::get();
        let wallet_address = self.get_current_wallet_address().await;
        let raw_metadata = &full_data.raw;
        let token_uri = raw_metadata.token_uri.clone();
        let metadata = raw_metadata.metadata.to_string();

        let _save_token = db
            .save_erc721_token_data(
                full_data.contract.address,
                chain_id,
                full_data.token_id,
                wallet_address,
                token_uri,
                metadata,
            )
            .await;
        if full_data.collection.is_none() {
            return Ok(());
        } else {
            let _save_collection = db
                .save_erc721_collection(
                    full_data.contract.address,
                    chain_id,
                    full_data
                        .collection
                        .as_ref()
                        .ok_or(Error::ParseError)?
                        .name
                        .clone()
                        .unwrap_or_default(),
                    full_data.contract.symbol.clone(),
                )
                .await;
        }
        Ok(())
    }

    async fn on_accept_erc1155(
        &self,
        chain_id: u64,
        full_data: &ErcMetadataResponse,
    ) -> Result<()> {
        let db = ethui_db::get();
        let wallet_address = self.get_current_wallet_address().await;
        let raw_metadata = &full_data.raw;
        let token_uri = raw_metadata.token_uri.clone();
        let metadata = raw_metadata.metadata.to_string();
        let balance = full_data.balance.expect("Error");
        let _save_token = db
            .save_erc1155_token_data(
                full_data.contract.address,
                chain_id,
                full_data.token_id,
                wallet_address,
                balance,
                token_uri,
                metadata,
            )
            .await;
        if full_data.collection.is_none() {
            return Ok(());
        } else {
            let _save_collection = db
                .save_erc1155_collection(
                    full_data.contract.address,
                    chain_id,
                    full_data
                        .collection
                        .as_ref()
                        .ok_or(Error::ParseError)?
                        .name
                        .clone()
                        .unwrap_or_default(),
                    full_data.contract.symbol.clone(),
                )
                .await;
        }
        Ok(())
    }
}
