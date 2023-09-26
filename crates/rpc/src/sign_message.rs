use std::str::FromStr;

use ethers::{
    core::k256::ecdsa::SigningKey,
    prelude::SignerMiddleware,
    providers::{Http, Middleware as _, Provider},
    signers,
    signers::Signer,
    types::{transaction::eip712, Bytes, Signature},
};
use iron_dialogs::{Dialog, DialogMsg};
use iron_networks::Network;
use iron_wallets::{Wallet, WalletControl};
use serde::Serialize;

use super::{Error, Result};

type Middleware = SignerMiddleware<Provider<Http>, signers::Wallet<SigningKey>>;

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
        let skip_dialog = self.network.is_dev() && self.wallet.is_dev();
        if !skip_dialog {
            self.spawn_dialog().await?;
        }
        self.sign().await
    }

    async fn spawn_dialog(&mut self) -> Result<()> {
        let params = serde_json::to_value(&self.data).unwrap();

        let dialog = Dialog::new("msg-sign", params);
        dialog.open().await?;

        match dialog.recv().await {
            Some(DialogMsg::Accept(_)) => Ok(()),

            _ =>
            // TODO: what's the appropriate error to return here?
            // or should we return Ok(_)? Err(_) seems to close the ws connection
            {
                Err(Error::TxDialogRejected)
            }
        }
    }

    pub async fn sign(&mut self) -> Result<Signature> {
        let signer = self.build_signer().await;

        match self.data {
            Data::Raw(ref msg) => {
                let bytes = Bytes::from_str(msg).unwrap();
                Ok(signer.sign(bytes, &signer.address()).await?)
            }
            Data::Typed(ref data) => Ok(signer.signer().sign_typed_data(&data.clone()).await?),
        }
    }

    async fn build_signer(&self) -> Middleware {
        let signer: signers::Wallet<SigningKey> = self
            .wallet
            .build_signer(self.network.chain_id, &self.wallet_path)
            .await
            .unwrap();

        SignerMiddleware::new(self.network.get_provider(), signer)
    }
}

#[derive(Serialize)]
enum Data {
    Raw(String),
    Typed(eip712::TypedData),
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

    pub fn set_typed_data(mut self, data: eip712::TypedData) -> SignMessageBuilder<'a> {
        self.data = Some(Data::Typed(data));
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
