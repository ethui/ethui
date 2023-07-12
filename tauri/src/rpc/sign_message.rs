use std::str::FromStr;

use ethers::{
    core::k256::ecdsa::SigningKey,
    prelude::SignerMiddleware,
    providers::{Http, Middleware, Provider},
    signers::{Signer, Wallet},
    types::{transaction::eip712, Address, Bytes, Signature},
};
use serde::Serialize;

use super::{Error, Result};
use crate::dialogs::{Dialog, DialogMsg};

#[derive(Default)]
pub struct SignMessage {
    pub dialog: bool,
    pub signer: Option<SignerMiddleware<Provider<Http>, Wallet<SigningKey>>>,
    address: Option<Address>,
    skip_dialog: bool,
    data: Option<Data>,
}

impl SignMessage {
    pub fn build_from_string(msg: String) -> Self {
        Self {
            data: Some(Data::Raw(msg)),
            ..Default::default()
        }
    }

    pub fn build_from_typed_data(data: eip712::TypedData) -> Self {
        Self {
            data: Some(Data::Typed(data)),
            ..Default::default()
        }
    }

    pub fn set_address(&mut self, addr: Address) -> &mut Self {
        self.address = Some(addr);
        self
    }

    pub fn set_signer(
        &mut self,
        signer: SignerMiddleware<Provider<Http>, Wallet<SigningKey>>,
    ) -> &mut Self {
        self.signer = Some(signer);
        self
    }

    pub fn skip_dialog(&mut self) -> &mut Self {
        self.skip_dialog = true;
        self
    }

    pub async fn finish(&mut self) -> Result<Signature> {
        if !self.skip_dialog {
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
        let signer = self.signer.as_ref().unwrap();

        match self.data {
            Some(Data::Raw(ref msg)) => {
                let bytes = Bytes::from_str(msg).unwrap();
                Ok(signer.sign(bytes, &self.address.unwrap()).await?)
            }
            Some(Data::Typed(ref data)) => {
                Ok(signer.signer().sign_typed_data(&data.clone()).await?)
            }
            None => Err(Error::SignatureRejected),
        }
    }
}

#[derive(Serialize)]
enum Data {
    Raw(String),
    Typed(eip712::TypedData),
}
