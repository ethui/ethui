use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{networks, NetworksActorExt as _};
use ethui_sync::{get_alchemy, Erc20Metadata, ErcMetadataResponse, ErcOwnersResponse};
use ethui_types::{prelude::*, TokenMetadata};
use ethui_wallets::{WalletControl, Wallets};

use crate::{Error, Result};

#[derive(Debug)]
pub struct TokenAdd {
    erc20_token: Option<TokenMetadata>,
    erc721_token: Option<ERC721Data>,
    erc1155_token: Option<ERC1155Data>,
    chain_id: Option<u32>,
    _type: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct Erc20FullData {
    metadata: TokenMetadata,
    alchemy_metadata: Erc20Metadata,
}

#[derive(Debug, Serialize)]
struct ERC721Data {
    address: Address,
    token_id: U256,
}

#[derive(Debug, Serialize)]
struct ERC1155Data {
    address: Address,
    token_id: U256,
}

impl TokenAdd {
    pub fn build() -> TokenAddBuilder {
        TokenAddBuilder::default()
    }

    pub async fn get_current_chain_id(&self) -> u32 {
        networks()
            .get_current()
            .await
            .expect("networks actor not available")
            .chain_id()
    }

    pub async fn get_current_wallet_address(&self) -> Address {
        let wallets = Wallets::read().await;
        wallets.get_current_wallet().get_current_address().await
    }

    pub async fn get_erc20_metadata(&self, chain_id: u32) -> Result<Erc20Metadata> {
        if let Some(erc20_token) = &self.erc20_token {
            let alchemy = get_alchemy(chain_id).await.map_err(|_| Error::ParseError)?;
            let metadata = alchemy
                .fetch_erc20_metadata(erc20_token.address)
                .await
                .map_err(|_| Error::ParseError)?;
            Ok(metadata)
        } else {
            Err(Error::ParseError)
        }
    }

    pub async fn get_erc_metadata(&self, chain_id: u32) -> Result<ErcMetadataResponse> {
        let alchemy = get_alchemy(chain_id).await.map_err(|_| Error::ParseError)?;
        match self._type.as_str() {
            "ERC721" => {
                if let Some(erc721_token) = &self.erc721_token {
                    let metadata_response = alchemy
                        .fetch_erc_metadata(
                            erc721_token.address,
                            erc721_token.token_id,
                            self._type.clone(),
                        )
                        .await
                        .map_err(|_| Error::ParseError)?;
                    Ok(metadata_response)
                } else {
                    Err(Error::ParseError)
                }
            }
            "ERC1155" => {
                if let Some(erc1155_token) = &self.erc1155_token {
                    let metadata_response = alchemy
                        .fetch_erc_metadata(
                            erc1155_token.address,
                            erc1155_token.token_id,
                            self._type.clone(),
                        )
                        .await
                        .map_err(|_| Error::ParseError)?;
                    Ok(metadata_response)
                } else {
                    Err(Error::ParseError)
                }
            }
            _ => Err(Error::TypeInvalid(self._type.clone())),
        }
    }

    pub async fn get_erc_owners(&self, chain_id: u32) -> Result<ErcOwnersResponse> {
        let alchemy = get_alchemy(chain_id).await.map_err(|_| Error::ParseError)?;
        match self._type.as_str() {
            "ERC721" => {
                if let Some(erc721_token) = &self.erc721_token {
                    let owners_response = alchemy
                        .fetch_erc_owners(erc721_token.address)
                        .await
                        .map_err(|_| Error::ParseError)?;
                    Ok(owners_response)
                } else {
                    Err(Error::ParseError)
                }
            }
            "ERC1155" => {
                if let Some(erc1155_token) = &self.erc1155_token {
                    let owners_response = alchemy
                        .fetch_erc_owners(erc1155_token.address)
                        .await
                        .map_err(|_| Error::ParseError)?;
                    Ok(owners_response)
                } else {
                    Err(Error::ParseError)
                }
            }
            _ => Err(Error::TypeInvalid(self._type.clone())),
        }
    }

    pub async fn get_erc1155_balances(&self, chain_id: u32) -> Result<U256> {
        if let Some(erc1155_token) = &self.erc1155_token {
            let wallet_address = self.get_current_wallet_address().await;
            let balances_response = self.get_erc_owners(chain_id).await.unwrap();

            let owners: HashSet<String> = balances_response
                .owners
                .iter()
                .map(|owner| owner.owner_address.clone())
                .collect();

            if !owners.contains(&wallet_address.to_string()) {
                Err(Error::ErcWrongOwner)
            } else {
                for owner in balances_response.owners {
                    if owner.owner_address == wallet_address.to_string() {
                        for token_balance in owner.token_balances {
                            if token_balance.token_id == erc1155_token.token_id.to_string() {
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
        } else {
            Err(Error::ParseError)
        }
    }

    pub async fn set_erc20_metadata(
        &self,
        metadata: TokenMetadata,
        alchemy_metadata: Erc20Metadata,
    ) -> Result<TokenMetadata> {
        // NOTE: metadata fetched from Alchemy is prioritized
        let metadata = TokenMetadata {
            address: metadata.address,
            name: if alchemy_metadata.name == Some("".to_string()) {
                metadata.name
            } else {
                alchemy_metadata.name
            },
            symbol: if alchemy_metadata.symbol == Some("".to_string()) {
                metadata.symbol
            } else {
                alchemy_metadata.symbol
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
        };
        Ok(metadata)
    }

    pub fn check_type(&self) -> Result<()> {
        if self._type != "ERC20" && self._type != "ERC721" && self._type != "ERC1155" {
            return Err(Error::TypeInvalid(self._type.clone()));
        }

        Ok(())
    }

    pub async fn check_network(&self) -> Result<()> {
        let current_chain_id = self.get_current_chain_id().await;
        let chain_id = self.chain_id.unwrap_or(current_chain_id);
        if current_chain_id != chain_id {
            return Err(Error::NetworkInvalid);
        }
        Ok(())
    }

    pub async fn check_erc20_metadata(
        &self,
        metadata: TokenMetadata,
        alchemy_metadata: Erc20Metadata,
    ) -> Result<()> {
        // NOTE: symbol is required for the token to be added
        if alchemy_metadata.symbol == Some("".to_string())
            && (metadata.symbol.is_none() || metadata.symbol == Some("".to_string()))
        {
            return Err(Error::SymbolMissing);
        } else if alchemy_metadata.symbol.unwrap_or("".to_string()).len() > 11
            || metadata.symbol.unwrap_or("".to_string()).len() > 11
        {
            return Err(Error::SymbolInvalid);
        } else if alchemy_metadata.decimals.unwrap_or(0) > 36 || metadata.decimals.unwrap_or(0) > 36
        {
            return Err(Error::DecimalsInvalid);
        }
        Ok(())
    }

    pub fn check_erc_type(&self, erc_data: Option<ErcMetadataResponse>) -> Result<()> {
        let token_type = erc_data.unwrap().contract.token_type;
        if token_type != self._type {
            return Err(Error::ErcTypeInvalid(self._type.clone(), token_type));
        }
        Ok(())
    }

    pub async fn check_erc_owner(&self, chain_id: u32) -> Result<()> {
        let wallet_address = self.get_current_wallet_address().await;
        let owners_response = self.get_erc_owners(chain_id).await.unwrap();

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

    pub async fn run(self) -> Result<()> {
        self.check_type()?;
        self.check_network().await?;

        let chain_id = self.get_current_chain_id().await;

        let mut erc20_full_data: Option<Erc20FullData> = None;
        let mut erc721_full_data: Option<ErcMetadataResponse> = None;
        let mut erc1155_full_data: Option<ErcMetadataResponse> = None;

        let dialog = match self._type.as_str() {
            "ERC20" => {
                let alchemy_metadata = self
                    .get_erc20_metadata(chain_id)
                    .await
                    .map_err(|_e| Error::TokenInvalid)?;
                self.check_erc20_metadata(
                    self.erc20_token.clone().unwrap(),
                    alchemy_metadata.clone(),
                )
                .await?;
                let final_metadata = self
                    .set_erc20_metadata(self.erc20_token.clone().unwrap(), alchemy_metadata.clone())
                    .await?;
                erc20_full_data = Some(Erc20FullData {
                    metadata: final_metadata,
                    alchemy_metadata,
                });
                Dialog::new("erc20-add", serde_json::to_value(&erc20_full_data).unwrap())
            }
            "ERC721" => {
                erc721_full_data = match self.get_erc_metadata(chain_id).await {
                    Ok(metadata_response) => Some(metadata_response),
                    Err(_e) => {
                        return Err(Error::TokenInvalid);
                    }
                };
                self.check_erc_type(erc721_full_data.clone())?;
                self.check_erc_owner(chain_id).await?;
                Dialog::new(
                    "erc721-add",
                    serde_json::to_value(erc721_full_data.clone()).unwrap(),
                )
            }
            "ERC1155" => {
                let metadata_response = self
                    .get_erc_metadata(chain_id)
                    .await
                    .map_err(|_e| Error::TokenInvalid)?;
                erc1155_full_data = Some(metadata_response.clone());
                self.check_erc_type(erc1155_full_data.clone())?;
                self.check_erc_owner(chain_id).await?;
                let balance = self.get_erc1155_balances(chain_id).await?;
                erc1155_full_data = Some(ErcMetadataResponse {
                    contract: metadata_response.contract,
                    token_id: metadata_response.token_id,
                    image: metadata_response.image,
                    raw: metadata_response.raw,
                    collection: metadata_response.collection,
                    balance: Some(balance),
                });
                self.get_erc1155_balances(chain_id).await?;
                Dialog::new(
                    "erc1155-add",
                    serde_json::to_value(erc1155_full_data.clone()).unwrap(),
                )
            }

            _ => return Err(Error::TypeInvalid(self._type.clone())),
        };
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        match self._type.as_str() {
                            "ERC20" => self.on_accept_erc20(chain_id, erc20_full_data).await?,
                            "ERC721" => {
                                self.on_accept_erc721(chain_id, erc721_full_data.unwrap())
                                    .await?
                            }
                            "ERC1155" => {
                                self.on_accept_erc1155(chain_id, erc1155_full_data.unwrap())
                                    .await?
                            }
                            _ => return Err(Error::TypeInvalid(self._type.clone())),
                        }
                        break;
                    }
                }

                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(())
    }

    pub async fn on_accept_erc20(
        &self,
        chain_id: u32,
        erc20_full_data: Option<Erc20FullData>,
    ) -> Result<()> {
        let db = ethui_db::get();
        let wallet_address = self.get_current_wallet_address().await;
        let erc20_data = erc20_full_data.unwrap();
        let _save_metadata = db
            .save_erc20_metadata(chain_id, erc20_data.metadata.clone())
            .await;
        let _save_balance = db
            .save_erc20_balance(
                chain_id,
                erc20_data.metadata.address,
                wallet_address,
                U256::from(0),
            )
            .await;
        Ok(())
    }

    pub async fn on_accept_erc721(
        &self,
        chain_id: u32,
        full_data: ErcMetadataResponse,
    ) -> Result<()> {
        let db = ethui_db::get();
        let wallet_address = self.get_current_wallet_address().await;
        let raw_metadata = full_data.raw;
        let token_uri = raw_metadata.token_uri;
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
                        .ok_or(Error::ParseError)?
                        .name
                        .unwrap_or_default(),
                    full_data.contract.symbol,
                )
                .await;
        }
        Ok(())
    }

    pub async fn on_accept_erc1155(
        &self,
        chain_id: u32,
        full_data: ErcMetadataResponse,
    ) -> Result<()> {
        let db = ethui_db::get();
        let wallet_address = self.get_current_wallet_address().await;
        let raw_metadata = full_data.raw;
        let token_uri = raw_metadata.token_uri;
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
                        .ok_or(Error::ParseError)?
                        .name
                        .unwrap_or_default(),
                    full_data.contract.symbol,
                )
                .await;
        }
        Ok(())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    _type: String,
    options: TokenOptions,
}

#[derive(Debug, Serialize)]
#[serde{untagged}]
pub enum TokenOptions {
    ERC20(ERC20Options),
    ERC721(ERC721Options),
    ERC1155(ERC1155Options),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ERC20Options {
    address: Address,
    chain_id: Option<u32>,
    name: Option<String>,
    symbol: Option<String>,
    decimals: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ERC721Options {
    address: Address,
    chain_id: Option<u32>,
    token_id: U256,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ERC1155Options {
    address: Address,
    chain_id: Option<u32>,
    token_id: U256,
}

#[derive(Default)]
pub struct TokenAddBuilder {
    params: Option<Params>,
}

impl TokenAddBuilder {
    pub fn set_params(mut self, params: serde_json::Value) -> Result<Self> {
        let params: serde_json::Value = if params.is_array() {
            params.as_array().unwrap()[0].clone()
        } else {
            params
        };

        let type_value: serde_json::Value = params
            .get("type")
            .ok_or(Error::TypeInvalid("Missing type field".to_string()))?
            .clone();
        let _type: String = serde_json::from_value(type_value)?;

        let deserialized_params: Params = match _type.as_str() {
            "ERC20" => {
                let options_value: serde_json::Value = params
                    .get("options")
                    .ok_or(Error::TypeInvalid(
                        "ERC20 type is missing options field".to_string(),
                    ))?
                    .clone();
                let options: ERC20Options = serde_json::from_value(options_value)?;
                Params {
                    _type,
                    options: TokenOptions::ERC20(options),
                }
            }
            "ERC721" => {
                let options_value: serde_json::Value = params
                    .get("options")
                    .ok_or(Error::TypeInvalid(
                        "ERC721 type is missing options field".to_string(),
                    ))?
                    .clone();
                let options: ERC721Options = serde_json::from_value(options_value)?;
                Params {
                    _type,
                    options: TokenOptions::ERC721(options),
                }
            }
            "ERC1155" => {
                let options_value: serde_json::Value = params
                    .get("options")
                    .ok_or(Error::TypeInvalid(
                        "ERC1155 type is missing options field".to_string(),
                    ))?
                    .clone();
                let options: ERC1155Options = serde_json::from_value(options_value)?;
                Params {
                    _type,
                    options: TokenOptions::ERC1155(options),
                }
            }
            _ => return Err(Error::TypeInvalid(_type)),
        };

        self.params = Some(deserialized_params);
        Ok(self)
    }

    pub async fn build(self) -> Result<TokenAdd> {
        let params = self.params.ok_or(Error::ParseError)?;

        Ok(match params.options {
            TokenOptions::ERC20(options) => {
                let metadata = TokenMetadata {
                    address: options.address,
                    name: options.name,
                    symbol: options.symbol,
                    decimals: options.decimals,
                };
                TokenAdd {
                    erc20_token: Some(metadata),
                    erc721_token: None,
                    erc1155_token: None,
                    chain_id: options.chain_id,
                    _type: params._type,
                }
            }
            TokenOptions::ERC721(options) => {
                let metadata = ERC721Data {
                    address: options.address,
                    token_id: options.token_id,
                };
                TokenAdd {
                    erc20_token: None,
                    erc721_token: Some(metadata),
                    erc1155_token: None,
                    chain_id: options.chain_id,
                    _type: params._type,
                }
            }
            TokenOptions::ERC1155(options) => {
                let metadata = ERC1155Data {
                    address: options.address,
                    token_id: options.token_id,
                };
                TokenAdd {
                    erc20_token: None,
                    erc721_token: None,
                    erc1155_token: Some(metadata),
                    chain_id: options.chain_id,
                    _type: params._type,
                }
            }
        })
    }
}
