use std::str::FromStr;

use ethers::core::k256::ecdsa::SigningKey;
use ethers::{
    prelude::*,
    signers,
    types::{serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction},
};
use iron_dialogs::{Dialog, DialogMsg};
use iron_networks::Network;
use iron_wallets::{Wallet, WalletControl};

use super::{Error, Result};

#[derive(Default)]
pub struct SendTransaction {
    pub wallet: Option<&Wallet>,
    pub network: Option<&Network>,
    pub request: TypedTransaction,
    skip_dialog: bool,
}

impl SendTransaction {
    pub fn set_wallet(&mut self, wallet: &Wallet) -> Self {
        self.wallet = Some(wallet);
        self
    }

    pub fn set_network(&mut self, network: &network) -> Self {
        self.network = Some(network);
        self
    }

    pub fn set_request(&mut self, params: serde_json::Value) -> &mut Self {
        // TODO: why is this an array?
        let params = if params.is_array() {
            &params.as_array().unwrap()[0]
        } else {
            &params
        };

        if let Some(from) = params["from"].as_str() {
            self.request.set_from(Address::from_str(from).unwrap());
        }

        if let Some(to) = params["to"].as_str() {
            self.request.set_to(Address::from_str(to).unwrap());
        }

        if let Some(value) = params["value"].as_str() {
            let v = StringifiedNumeric::String(value.to_string());
            self.request.set_value(U256::try_from(v).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            self.request.set_data(Bytes::from_str(data).unwrap());
        }

        self
    }

    pub async fn estimate_gas(&mut self) -> &mut Self {
        // TODO: we're defaulting to 1_000_000 gas cost if estimation fails
        // estimation failing means the tx will faill anyway, so this is fine'ish
        // but can probably be improved a lot in the future
        let gas_limit = self
            .signer
            .as_ref()
            .unwrap()
            .estimate_gas(&self.request, None)
            .await
            .unwrap_or(1_000_000.into());

        self.request.set_gas(gas_limit * 120 / 100);
        self
    }

    pub fn skip_dialog(&mut self) -> &mut Self {
        self.skip_dialog = true;
        self
    }

    pub async fn finish(&mut self) -> Result<PendingTransaction<'_, Http>> {
        if !self.skip_dialog {
            self.spawn_dialog().await?;
        }
        self.send().await
    }

    async fn spawn_dialog(&mut self) -> Result<()> {
        let params = serde_json::to_value(&self.request).unwrap();

        let dialog = Dialog::new("tx-review", params);
        dialog.open().await?;

        match dialog.recv().await {
            // TODO: in the future, send json values here to override params
            Some(DialogMsg::Accept(_response)) => Ok(()),

            _ =>
            // TODO: what's the appropriate error to return here?
            // or should we return Ok(_)? Err(_) seems to close the ws connection
            {
                Err(Error::TxDialogRejected)
            }
        }
    }

    async fn send(&mut self) -> Result<PendingTransaction<'_, Http>> {
        let signer = self.wallet.build_signer().await.unwrap();

        Ok(signer.send_transaction(self.request.clone(), None).await?)
    }
}
