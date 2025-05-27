use std::str::FromStr;

use alloy::{
    dyn_abi::TypedData,
    primitives::{Bytes, Signature},
    signers::Signer as _,
};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_settings::Settings;
use ethui_types::{GlobalState, Network};
use ethui_wallets::{Signer, Wallet, WalletControl};
use serde::Serialize;

use crate::{Error, Result};

/// Orchestrates message signing
/// Takes references to both the wallet and network
pub struct SignMessage<'a> {
    pub wallet: &'a Wallet,
    pub wallet_path: String,
    pub network: Network,
    data: Data,
}

impl<'a> SignMessage<'a> {
    pub fn build() -> SignMessageBuilder<'a> {
        Default::default()
    }

    pub async fn finish(&mut self) -> Result<Signature> {
        let skip = {
            self.network.is_dev().await
                && self.wallet.is_dev()
                && Settings::read().await.fast_mode()
        };

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
            Data::Raw(ref msg) => {
                let bytes = Bytes::from_str(msg).unwrap();
                Ok(signer.sign_message(&bytes).await?)
            }
            Data::Typed(ref data) => Ok(signer.sign_dynamic_typed_data(data).await?),
        }
    }

    async fn build_signer(&self) -> Signer {
        self.wallet
            .build_signer(self.network.chain_id(), &self.wallet_path)
            .await
            .unwrap()
    }
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
enum Data {
    Raw(String),
    Typed(Box<TypedData>),
}

#[derive(Default)]
pub struct SignMessageBuilder<'a> {
    pub wallet: Option<&'a Wallet>,
    pub wallet_path: Option<String>,
    pub network: Option<Network>,
    data: Option<Data>,
}

impl<'a> SignMessageBuilder<'a> {
    pub fn set_wallet(mut self, wallet: &'a Wallet) -> SignMessageBuilder<'a> {
        self.wallet = Some(wallet);
        self
    }

    pub fn set_wallet_path(mut self, wallet_path: String) -> SignMessageBuilder<'a> {
        self.wallet_path = Some(wallet_path);
        self
    }

    pub fn set_network(mut self, network: Network) -> SignMessageBuilder<'a> {
        self.network = Some(network);
        self
    }

    pub fn set_string_data(mut self, msg: String) -> SignMessageBuilder<'a> {
        self.data = Some(Data::Raw(msg));
        self
    }

    pub fn set_typed_data(mut self, data: TypedData) -> SignMessageBuilder<'a> {
        self.data = Some(Data::Typed(Box::new(data)));
        self
    }

    pub fn build(self) -> SignMessage<'a> {
        tracing::debug!("building SendTransaction");

        SignMessage {
            wallet: self.wallet.unwrap(),
            wallet_path: self.wallet_path.unwrap(),
            network: self.network.unwrap(),
            data: self.data.unwrap(),
        }
    }
}
