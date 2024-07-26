use crate::{Error, Result};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::Networks;
use ethui_types::{Address, GlobalState, TokenMetadata, U256};
use ethui_wallets::{WalletControl, Wallets};
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub struct TokenAdd {
    erc20_token: Option<TokenMetadata>,
    erc721_token: Option<ERC721Data>,
    erc1155_token: Option<ERC1155Data>,
    chain_id: Option<u32>,
    _type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ERC721Data {
    address: Address,
    token_id: U256,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ERC1155Data {
    address: Address,
    token_id: U256,
}

impl TokenAdd {
    pub fn build() -> TokenAddBuilder {
        TokenAddBuilder::default()
    }

    pub async fn get_current_chain_id(&self) -> u32 {
        let networks = Networks::read().await;
        let current_network = networks.get_current();
        current_network.chain_id
    }

    pub async fn get_current_wallet_address(&self) -> Address {
        let wallets = Wallets::read().await;
        wallets.get_current_wallet().get_current_address().await
    }

    pub fn check_type(&self) -> Result<()> {
        if self._type != "ERC20" && self._type != "ERC721" && self._type != "ERC1155" {
            return Err(Error::TypeInvalid(self._type.clone()));
        }

        Ok(())
    }

    pub fn check_symbol(&self) -> Result<()> {
        if let Some(erc20_token) = &self.erc20_token {
            let symbol = erc20_token.symbol.clone().unwrap_or_default();
            if symbol.len() > 11 {
                return Err(Error::SymbolInvalid(symbol));
            }
            Ok(())
        } else {
            Err(Error::ParseError)
        }
    }

    pub fn check_decimals(&self) -> Result<()> {
        if let Some(erc20_token) = &self.erc20_token {
            let decimals = erc20_token.decimals.unwrap_or(0);
            if decimals > 36 {
                return Err(Error::DecimalsInvalid(decimals));
            }
            Ok(())
        } else {
            Err(Error::ParseError)
        }
    }

    pub async fn check_network(&self) -> Result<()> {
        let current_chain_id = self.get_current_chain_id().await;
        let chain_id = self.chain_id.unwrap_or(current_chain_id);
        if current_chain_id != chain_id {
            return Err(Error::NetworkInvalid);
        }
        Ok(())
    }

    pub async fn run(self) -> Result<()> {
        self.check_type()?;
        self.check_network().await?;

        let dialog = match self._type.as_str() {
            "ERC20" => {
                self.check_symbol()?;
                self.check_decimals()?;
                // TODO: check if 'type' from call matches the added 'tokenType'
                Dialog::new(
                    "erc20-add",
                    serde_json::to_value(&self.erc20_token).unwrap(),
                )
            }
            "ERC721" => {
                // TODO: check if 'type' from call matches the added 'tokenType'
                // TODO: check if wallet is the owner of the token
                Dialog::new(
                    "erc721-add",
                    serde_json::to_value(&self.erc721_token).unwrap(),
                )
            }
            "ERC1155" => {
                // TODO: check if 'type' from call matches the added 'tokenType'
                // TODO: check if wallet is the owner of the token
                Dialog::new(
                    "erc1155-add",
                    serde_json::to_value(&self.erc1155_token).unwrap(),
                )
            }
            _ => return Err(Error::TypeInvalid(self._type.clone())),
        };
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        self.on_accept().await?;
                        break;
                    }
                }

                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(())
    }

    pub async fn on_accept(&self) -> Result<()> {
        let current_wallet_address = self.get_current_wallet_address().await;
        let current_chain_id = self.get_current_chain_id().await;
        match self._type.as_str() {
            "ERC20" => if let Some(erc20_token) = &self.erc20_token {},
            "ERC721" => if let Some(erc721_token) = &self.erc721_token {},
            "ERC1155" => if let Some(erc1155_token) = &self.erc1155_token {},
            _ => return Err(Error::TypeInvalid(self._type.clone())),
        }

        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    _type: String,
    options: TokenOptions,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde{untagged}]
pub enum TokenOptions {
    ERC20(ERC20Options),
    ERC721(ERC721Options),
    ERC1155(ERC1155Options),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ERC20Options {
    address: Address,
    chain_id: Option<u32>,
    name: Option<String>,
    symbol: Option<String>,
    decimals: Option<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ERC721Options {
    address: Address,
    chain_id: Option<u32>,
    token_id: U256,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

    pub async fn build(self) -> TokenAdd {
        let params = self.params.unwrap();

        match params.options {
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
        }
    }
}
