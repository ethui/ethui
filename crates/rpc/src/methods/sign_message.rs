use std::str::FromStr;

use alloy::{
    dyn_abi::TypedData,
    primitives::{Bytes, Signature},
    signers::Signer as _,
};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_settings::actor::*;
use ethui_types::Network;
use ethui_wallets::{Signer, Wallet, WalletControl};
use serde::Serialize;

use crate::{Error, Result};

/// Orchestrates message signing
pub struct SignMessage {
    pub wallet: Wallet,
    pub wallet_path: String,
    pub network: Network,
    data: Data,
}

impl SignMessage {
    pub fn build() -> SignMessageBuilder {
        Default::default()
    }

    pub async fn finish(&mut self) -> Result<Signature> {
        let skip = self.network.is_dev().await
            && self.wallet.is_dev()
            && settings_ref()
                .ask(GetAll)
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
pub struct SignMessageBuilder {
    pub wallet: Option<Wallet>,
    pub wallet_path: Option<String>,
    pub network: Option<Network>,
    data: Option<Data>,
}

impl SignMessageBuilder {
    pub fn set_wallet(mut self, wallet: Wallet) -> SignMessageBuilder {
        self.wallet = Some(wallet);
        self
    }

    pub fn set_wallet_path(mut self, wallet_path: String) -> SignMessageBuilder {
        self.wallet_path = Some(wallet_path);
        self
    }

    pub fn set_network(mut self, network: Network) -> SignMessageBuilder {
        self.network = Some(network);
        self
    }

    pub fn set_string_data(mut self, msg: String) -> SignMessageBuilder {
        self.data = Some(Data::Raw(msg));
        self
    }

    pub fn set_typed_data(mut self, data: TypedData) -> SignMessageBuilder {
        self.data = Some(Data::Typed(Box::new(data)));
        self
    }

    pub fn build(self) -> SignMessage {
        tracing::debug!("building SendTransaction");

        SignMessage {
            wallet: self.wallet.unwrap(),
            wallet_path: self.wallet_path.unwrap(),
            network: self.network.unwrap(),
            data: self.data.unwrap(),
        }
    }
}
