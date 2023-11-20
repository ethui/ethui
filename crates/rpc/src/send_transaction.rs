use std::str::FromStr;

use ethers::{
    prelude::*,
    types::{serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction},
};
use iron_connections::Ctx;
use iron_dialogs::{Dialog, DialogMsg};
use iron_networks::Network;
use iron_settings::Settings;
use iron_types::{Address, GlobalState, ToAlloy, ToEthers};
use iron_wallets::{WalletControl, WalletType, Wallets};

use super::{Error, Result};

/// Orchestrates the signing of a transaction
/// Takes references to both the wallet and network where this
#[derive(Debug)]
pub struct SendTransaction {
    pub network: Network,
    pub wallet_name: String,
    pub wallet_path: String,
    pub wallet_type: WalletType,
    pub request: TypedTransaction,
    pub signer: Option<SignerMiddleware<Provider<Http>, iron_wallets::Signer>>,
}

impl<'a> SendTransaction {
    pub fn build(ctx: &Ctx) -> SendTransactionBuilder<'_> {
        SendTransactionBuilder::new(ctx)
    }

    pub async fn estimate_gas(&mut self) -> &mut SendTransaction {
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
        self
    }

    pub async fn finish(&mut self) -> Result<PendingTransaction<'_, Http>> {
        // inner scope so as not to lock wallets for the entire duration of the tx review
        let skip = {
            let wallets = Wallets::read().await;
            let wallet = wallets.get(&self.wallet_name).unwrap();

            self.network.is_dev() && wallet.is_dev() && Settings::read().await.fast_mode()
        };

        // skip the dialog if both network & wallet allow for it, and if fast_mode is enabled
        if skip {
            self.send().await
        } else {
            self.dialog_and_send().await
        }
    }

    async fn dialog_and_send(&mut self) -> Result<PendingTransaction<'_, Http>> {
        let mut params = serde_json::to_value(&self.request).unwrap();
        params["chainId"] = self.network.chain_id.into();
        params["walletType"] = self.wallet_type.to_string().into();

        let dialog = Dialog::new("tx-review", params);
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => match msg.as_str() {
                    Some("simulate") => self.simulate(&dialog).await?,
                    Some("accept") => break,
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
            dialog.send("check-ledger", None).await.unwrap();
        }

        let tx = self.send().await?;

        Ok(tx)
    }

    async fn simulate(&self, dialog: &Dialog) -> Result<()> {
        let chain_id = self.network.chain_id;
        let request = self.simulation_request().await?;

        if let Ok(sim) = iron_simulator::commands::simulator_run(chain_id, request).await {
            dialog
                .send(
                    "simulation-result",
                    Some(serde_json::to_value(sim).unwrap()),
                )
                .await
                .unwrap()
        }

        Ok(())
    }

    async fn send(&mut self) -> Result<PendingTransaction<'_, Http>> {
        self.build_signer().await;
        let signer = self.signer.as_ref().unwrap();

        Ok(signer.send_transaction(self.request.clone(), None).await?)
    }

    async fn build_signer(&mut self) {
        if self.signer.is_none() {
            let wallets = Wallets::read().await;
            let wallet = wallets.get(&self.wallet_name).unwrap();

            let signer = wallet
                .build_signer(self.network.chain_id, &self.wallet_path)
                .await
                .unwrap();

            let signer = SignerMiddleware::new(self.network.get_provider(), signer);
            self.signer = Some(signer);
        }
    }

    async fn simulation_request(&self) -> Result<iron_simulator::Request> {
        let tx_request = self.request.clone();

        Ok(iron_simulator::Request {
            from: self.from().await.map_err(|_| Error::CannotSimulate)?,
            to: tx_request
                .to()
                .ok_or(())
                .and_then(|v| match v {
                    NameOrAddress::Name(_) => Err(()),
                    NameOrAddress::Address(a) => Ok(a.to_alloy()),
                })
                .map_err(|_| Error::CannotSimulate)?,
            value: tx_request.value().cloned(),
            data: tx_request.data().cloned(),
            gas_limit: tx_request
                .gas()
                .map(|v| v.as_u64())
                .ok_or(())
                .map_err(|_| Error::CannotSimulate)?,
        })
    }

    async fn from(&self) -> Result<Address> {
        let wallets = Wallets::read().await;
        let wallet = wallets.get(&self.wallet_name).unwrap();

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
    pub request: TypedTransaction,
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
            self.request.set_from(address.to_ethers());

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
            self.request
                .set_from(wallet.get_current_address().await.to_ethers());
            self.wallet_name = Some(wallet.name());
            self.wallet_type = Some(wallet.into());
        }

        if let Some(to) = params["to"].as_str() {
            self.request
                .set_to(Address::from_str(to).unwrap().to_ethers());
        }

        if let Some(value) = params["value"].as_str() {
            let v = StringifiedNumeric::String(value.to_string());
            self.request.set_value(U256::try_from(v).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            self.request.set_data(Bytes::from_str(data).unwrap());
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
            signer: None,
        }
    }
}
