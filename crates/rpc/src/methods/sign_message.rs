use std::str::FromStr;

use alloy::{
    dyn_abi::TypedData,
    hex,
    primitives::{Bytes, Signature},
    signers::Signer as _,
};
use ethui_connections::Ctx;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_settings::{SettingsActorExt as _, settings};
use ethui_types::{Address, Json, Network};
use ethui_wallets::{Signer, Wallet, WalletControl};
use jsonrpc_core::Params as RpcParams;
use serde::Serialize;

use crate::{Error, Result, methods::Method};

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
enum SignData {
    Raw(String),
    Typed(Box<TypedData>),
}

/// Handler for eth_sign / personal_sign
pub(crate) struct EthSign {
    inner: SignMessage,
}

impl Method for EthSign {
    async fn build(params: RpcParams, ctx: Ctx) -> Result<Self> {
        // Params format: [message, address]
        let params: Vec<Option<String>> = params.parse()?;
        let message = params
            .first()
            .and_then(|v| v.clone())
            .ok_or(Error::ParseError)?;
        // TODO: use address to verify it matches the wallet
        let _address = params
            .get(1)
            .and_then(|v| v.as_ref())
            .and_then(|s| Address::from_str(s).ok())
            .ok_or(Error::ParseError)?;

        let wallet = ethui_wallets::get_current_wallet().await;
        let wallet_path = wallet.get_current_path();
        let network = ctx.network().await;

        Ok(Self {
            inner: SignMessage {
                wallet,
                wallet_path,
                network,
                data: SignData::Raw(message),
            },
        })
    }

    async fn run(mut self) -> Result<Json> {
        let result = self.inner.finish().await?;
        Ok(format!("0x{}", hex::encode(result.as_bytes())).into())
    }
}

/// Handler for eth_signTypedData / eth_signTypedData_v4
pub(crate) struct EthSignTypedData {
    inner: SignMessage,
}

impl Method for EthSignTypedData {
    async fn build(params: RpcParams, ctx: Ctx) -> Result<Self> {
        // Params format: [address, typed_data_json]
        let params: Vec<Option<String>> = params.parse()?;
        // TODO: use address to verify it matches the wallet
        let _address = params
            .first()
            .and_then(|v| v.as_ref())
            .and_then(|s| Address::from_str(s).ok());
        let typed_data_str = params
            .get(1)
            .and_then(|v| v.clone())
            .ok_or(Error::ParseError)?;
        let typed_data: TypedData = serde_json::from_str(&typed_data_str)?;

        let wallet = ethui_wallets::get_current_wallet().await;
        let wallet_path = wallet.get_current_path();
        let network = ctx.network().await;

        Ok(Self {
            inner: SignMessage {
                wallet,
                wallet_path,
                network,
                data: SignData::Typed(Box::new(typed_data)),
            },
        })
    }

    async fn run(mut self) -> Result<Json> {
        let result = self.inner.finish().await?;
        Ok(format!("0x{}", hex::encode(result.as_bytes())).into())
    }
}

/// Orchestrates message signing (internal implementation)
struct SignMessage {
    wallet: Wallet,
    wallet_path: String,
    network: Network,
    data: SignData,
}

impl SignMessage {
    pub async fn finish(&mut self) -> Result<Signature> {
        let skip = self.network.is_dev().await?
            && self.wallet.is_dev()
            && settings()
                .get_all()
                .await
                .expect("Failed to get settings")
                .fast_mode;

        if !skip {
            self.spawn_dialog().await?;
        }

        self.sign().await
    }

    async fn spawn_dialog(&mut self) -> Result<()> {
        let params = serde_json::to_value(&self.data).unwrap();

        let dialog = Dialog::new("msg-sign", params);
        dialog.open().await?;

        if let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => match msg.as_str() {
                    Some("accept") => Ok(()),
                    // TODO: what's the appropriate error to return here?
                    // or should we return Ok(_)? Err(_) seems to close the ws connection
                    _ => Err(Error::TxDialogRejected),
                },

                DialogMsg::Close => Err(Error::TxDialogRejected),
            }
        } else {
            Err(Error::TxDialogRejected)
        }
    }

    pub async fn sign(&mut self) -> Result<Signature> {
        let signer = self.build_signer().await;

        match self.data {
            SignData::Raw(ref msg) => {
                let bytes = Bytes::from_str(msg).unwrap();
                Ok(signer.sign_message(&bytes).await?)
            }
            SignData::Typed(ref data) => Ok(signer.sign_dynamic_typed_data(data).await?),
        }
    }

    async fn build_signer(&self) -> Signer {
        self.wallet
            .build_signer(self.network.chain_id(), &self.wallet_path)
            .await
            .unwrap()
    }
}
