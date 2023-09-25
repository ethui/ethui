use std::str::FromStr;

use ethers::{
    core::k256::ecdsa::SigningKey,
    prelude::*,
    signers,
    types::{serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction},
};
use iron_dialogs::{Dialog, DialogMsg};
use iron_networks::Network;
use iron_wallets::{Wallet, WalletControl};

use super::{Error, Result};

/// Orchestrates the signing of a transaction
/// Takes references to both the wallet and network where this
pub struct SendTransaction<'a> {
    pub wallet: &'a Wallet,
    pub wallet_path: String,
    pub network: Network,
    pub request: TypedTransaction,
    pub signer: Option<SignerMiddleware<Provider<Http>, signers::Wallet<SigningKey>>>,
}

impl<'a> SendTransaction<'a> {
    pub fn build() -> SendTransactionBuilder<'a> {
        Default::default()
    }

    pub async fn estimate_gas(&mut self) -> &mut SendTransaction<'a> {
        // TODO: we're defaulting to 1_000_000 gas cost if estimation fails
        // estimation failing means the tx will faill anyway, so this is fine'ish
        // but can probably be improved a lot in the future
        let gas_limit = self
            .network
            .get_provider()
            .estimate_gas(&self.request, None)
            .await
            .unwrap_or(1_000_000.into());

        self.request.set_gas(gas_limit * 120 / 100);
        self.request.set_gas_price(gas_limit * 120 / 100);
        self
    }

    pub async fn finish(&mut self) -> Result<PendingTransaction<'_, Http>> {
        tracing::debug!("finishing transaction");

        let skip_dialog = self.network.is_dev() && self.wallet.is_dev();
        if !skip_dialog {
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

    async fn build_signer(&mut self) {
        if self.signer.is_none() {
            let signer: signers::Wallet<SigningKey> = self
                .wallet
                .build_signer(self.network.chain_id, &self.wallet_path)
                .await
                .unwrap();
            self.signer = Some(SignerMiddleware::new(self.network.get_provider(), signer));
        }
    }

    async fn send(&mut self) -> Result<PendingTransaction<'_, Http>> {
        self.build_signer().await;
        let signer = self.signer.as_ref().unwrap();

        Ok(signer.send_transaction(self.request.clone(), None).await?)
    }
}

#[derive(Default)]
pub struct SendTransactionBuilder<'a> {
    pub wallet: Option<&'a Wallet>,
    pub wallet_path: Option<String>,
    pub network: Option<Network>,
    pub request: TypedTransaction,
}

impl<'a> SendTransactionBuilder<'a> {
    pub fn set_wallet(mut self, wallet: &'a Wallet) -> SendTransactionBuilder<'a> {
        self.wallet = Some(wallet);
        self
    }

    pub fn set_wallet_path(mut self, wallet_path: String) -> SendTransactionBuilder<'a> {
        self.wallet_path = Some(wallet_path);
        self
    }

    pub fn set_network(mut self, network: Network) -> SendTransactionBuilder<'a> {
        self.network = Some(network);
        self
    }

    pub fn set_request(mut self, params: serde_json::Value) -> SendTransactionBuilder<'a> {
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

        if let Some(gas) = params["gas"].as_str() {
            let v = StringifiedNumeric::String(gas.to_string());
            self.request.set_gas(U256::try_from(v).unwrap());
        }

        //these last two conditions must be different
        if let Some(max_priority_fee_per_gas) = params["max_priority_fee_per_gas"].as_str() {
            let v = StringifiedNumeric::String(max_priority_fee_per_gas.to_string());
            self.request.set_gas_price(U256::try_from(v).unwrap());
        }

        if let Some(max_fee_per_gas) = params["max_fee_per_gas"].as_str() {
            let v = StringifiedNumeric::String(max_fee_per_gas.to_string());
            self.request.set_gas_price(U256::try_from(v).unwrap());
        }
        self
    }

    pub fn build(self) -> SendTransaction<'a> {
        tracing::debug!("building SendTransaction");

        SendTransaction {
            wallet: self.wallet.unwrap(),
            wallet_path: self.wallet_path.unwrap(),
            network: self.network.unwrap(),
            request: self.request,
            signer: None,
        }
    }
}
