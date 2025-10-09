use std::str::FromStr;

use alloy::{
    network::{Ethereum, TransactionBuilder as _},
    providers::{PendingTransactionBuilder, Provider, ProviderBuilder, ext::AnvilApi},
    rpc::types::TransactionRequest,
};
use ethui_connections::Ctx;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_settings::GetAll;
use ethui_types::prelude::*;
use ethui_wallets::{WalletControl, WalletType, Wallets};

use crate::{Error, Result};

/// Orchestrates the signing of a transaction
/// Takes references to both the wallet and network where this
pub struct SendTransaction {
    pub network: Network,
    pub wallet_name: String,
    pub wallet_path: String,
    pub wallet_type: WalletType,
    pub request: TransactionRequest,
    pub provider: Option<Box<dyn Provider<Ethereum>>>,
}

impl SendTransaction {
    pub fn build(ctx: &Ctx) -> SendTransactionBuilder<'_> {
        SendTransactionBuilder::new(ctx)
    }

    pub async fn estimate_gas(&mut self) -> &mut SendTransaction {
        // TODO: we're defaulting to 1_000_000 gas cost if estimation fails
        // estimation failing means the tx will fail anyway, so this is fine'ish
        // but can probably be improved a lot in the future

        // TODO: check how to make this work with alloy
        //let gas_limit = self
        //    .network
        //    .get_provider()
        //    .estimate_gas(&self.request, None)
        //    .await
        //    .unwrap_or(1_000_000.into());

        let gas_limit = 1_000_000;

        self.request.set_gas_limit(gas_limit * 120 / 100);
        self
    }

    pub async fn finish(&mut self) -> Result<PendingTransactionBuilder<Ethereum>> {
        // inner scope so as not to lock wallets for the entire duration of the tx review
        let skip = {
            let wallets = Wallets::read().await;
            let wallet = wallets
                .get(&self.wallet_name)
                .ok_or_else(|| Error::WalletNameNotFound(self.wallet_name.clone()))?;

            self.network.is_dev().await && wallet.is_dev() && {
                ethui_settings::ask(GetAll).await?.fast_mode
            }
        };

        // skip the dialog if both network & wallet allow for it, and if fast_mode is enabled
        if skip {
            self.send().await
        } else {
            self.dialog_and_send().await
        }
    }

    async fn dialog_and_send(&mut self) -> Result<PendingTransactionBuilder<Ethereum>> {
        let mut params = serde_json::to_value(&self.request).unwrap();
        params["chainId"] = self.network.chain_id().into();
        params["walletType"] = self.wallet_type.to_string().into();

        let dialog = Dialog::new("tx-review", params);
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => match &msg["event"].as_str() {
                    Some("simulate") => {
                        dialog.send("trying", None).await?;
                        self.simulate(&dialog).await?
                    }
                    Some("accept") => break,
                    Some("update") => {
                        self.update(msg);
                        self.simulate(&dialog).await?
                    }
                    // TODO: what's the appropriate error to return here?
                    // or should we return Ok(_)? Err(_) seems too close the ws connection
                    _ => {
                        return Err(Error::TxDialogRejected);
                    }
                },

                DialogMsg::Close => return Err(Error::TxDialogRejected),
            }
        }

        if self.is_ledger() {
            dialog.send("check-ledger", None).await?;
        }

        let tx = self.send().await?;

        Ok(tx)
    }

    fn update(&mut self, data: serde_json::Value) {
        if let Some(data) = data["data"].as_str() {
            self.request.set_input(Bytes::from_str(data).unwrap());
        }

        if let Some(value) = data["value"].as_str() {
            // TODO: does this work with both hex and decimal?
            self.request.set_value(U256::from_str(value).unwrap());
        }
    }

    async fn simulate(&self, dialog: &Dialog) -> Result<()> {
        let chain_id = self.network.chain_id();
        let request = self.simulation_request().await?;

        if let Ok(sim) = ethui_simulator::commands::simulator_run(chain_id, request).await {
            dialog.send("foo", None).await?;
            dialog
                .send("simulation-result", Some(serde_json::to_value(sim)?))
                .await?
        }

        Ok(())
    }

    async fn send(&mut self) -> Result<PendingTransactionBuilder<Ethereum>> {
        self.build_provider().await?;
        let provider = self.provider.as_ref().unwrap();

        ethui_broadcast::transaction_submitted(self.network.chain_id()).await;

        let pending = provider.send_transaction(self.request.clone()).await?;
        Ok(pending)
    }

    async fn build_provider(&mut self) -> Result<()> {
        if self.provider.is_some() {
            return Ok(());
        }

        let wallets = Wallets::read().await;
        let wallet = wallets
            .get(&self.wallet_name)
            .ok_or(Error::WalletNameNotFound(self.wallet_name.clone()))?
            .clone();

        let url = self
            .network
            .http_url
            .to_string()
            .parse()
            .map_err(|_| Error::CannotParseUrl(self.network.http_url.to_string().clone()))?;

        self.provider = if self.network.is_dev().await {
            // TODO: maybe we can find a way to only do this once for every account,
            // or only call anvil_autoImpersonate once for the whole network,
            // instead of making this request for every single transaction.
            // this is just a minor optimization, though
            let provider = ProviderBuilder::new().connect_http(url);
            provider.anvil_auto_impersonate_account(true).await?;
            Some(Box::new(provider))
        } else {
            let signer = wallet
                .build_signer(self.network.chain_id(), &self.wallet_path)
                .await?;
            let provider = ProviderBuilder::new()
                .wallet(signer.to_wallet())
                .connect_http(url);
            Some(Box::new(provider))
        };

        Ok(())
    }

    async fn simulation_request(&self) -> Result<ethui_simulator::Request> {
        let tx_request = self.request.clone();

        Ok(ethui_simulator::Request {
            from: self.from().await.map_err(|_| Error::CannotSimulate)?,
            to: tx_request
                .to
                .map(|v| v.into())
                .ok_or(())
                .map_err(|_| Error::CannotSimulate)?,
            value: tx_request.value,
            data: tx_request.input.clone().into_input(),
            gas_limit: tx_request
                .gas
                .ok_or(())
                .map_err(|_| Error::CannotSimulate)?,
        })
    }

    async fn from(&self) -> Result<Address> {
        let wallets = Wallets::read().await;
        let wallet = wallets
            .get(&self.wallet_name)
            .ok_or_else(|| Error::WalletNameNotFound(self.wallet_name.clone()))?;

        wallet
            .get_address(&self.wallet_path)
            .await
            .map_err(|_| Error::CannotSimulate)
    }

    fn is_ledger(&self) -> bool {
        self.wallet_type == WalletType::Ledger
    }
}

pub struct SendTransactionBuilder<'a> {
    ctx: &'a Ctx,
    pub wallet_name: Option<String>,
    pub wallet_path: Option<String>,
    pub wallet_type: Option<WalletType>,
    pub request: TransactionRequest,
}

impl<'a> SendTransactionBuilder<'a> {
    pub fn new(ctx: &'a Ctx) -> Self {
        Self {
            ctx,
            wallet_name: None,
            wallet_path: None,
            wallet_type: None,
            request: Default::default(),
        }
    }

    pub async fn set_request(
        mut self,
        params: serde_json::Value,
    ) -> Result<SendTransactionBuilder<'a>> {
        // TODO: why is this an array?
        let params = if params.is_array() {
            &params.as_array().unwrap()[0]
        } else {
            &params
        };

        let wallets = Wallets::read().await;
        if let Some(from) = params["from"].as_str() {
            let address = Address::from_str(from).unwrap();
            self.request.set_from(address);

            let (wallet, path) = wallets
                .find(address)
                .await
                .ok_or(Error::WalletNotFound(address))?;
            self.wallet_name = Some(wallet.name());
            self.wallet_path = Some(path);
            self.wallet_type = Some(wallet.into());
        } else {
            let wallet = wallets.get_current_wallet();

            self.wallet_path = Some(wallet.get_current_path());
            self.request.set_from(wallet.get_current_address().await);
            self.wallet_name = Some(wallet.name());
            self.wallet_type = Some(wallet.into());
        }

        if let Some(to) = params["to"].as_str() {
            self.request.set_to(Address::from_str(to).unwrap());
        }

        if let Some(value) = params["value"].as_str() {
            // TODO: does this support both hex and decimal?
            self.request.set_value(U256::from_str(value).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            self.request.set_input(Bytes::from_str(data).unwrap());
        }

        Ok(self)
    }

    pub async fn build(self) -> SendTransaction {
        SendTransaction {
            wallet_name: self.wallet_name.unwrap(),
            wallet_path: self.wallet_path.unwrap(),
            wallet_type: self.wallet_type.unwrap(),
            network: self.ctx.network().await,
            request: self.request,
            provider: None,
        }
    }
}
