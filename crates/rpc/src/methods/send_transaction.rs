use std::str::FromStr;

use alloy::{
    network::{Ethereum, EthereumWallet, NetworkWallet, TransactionBuilder as _},
    providers::{DynProvider, PendingTransactionBuilder, Provider, ProviderBuilder},
    rpc::types::TransactionRequest,
};
use ethui_connections::Ctx;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_settings::{SettingsActorExt as _, settings};
use ethui_types::prelude::*;
use ethui_wallets::{WalletControl, WalletType, Wallets};
use jsonrpc_core::Params as RpcParams;

use super::send_call::CallParams;
use crate::{Error, Result, methods::Method, params::extract_single_param};

/// Orchestrates the signing of a transaction
pub(crate) struct SendTransaction {
    pub(crate) network: Network,
    pub(crate) from: Address,
    pub(crate) request: TransactionRequest,
}

/// Holds resolved wallet information during transaction processing
struct ResolvedWallet {
    name: String,
    path: String,
    wallet_type: WalletType,
}

impl Method for SendTransaction {
    async fn build(params: RpcParams, ctx: Ctx) -> Result<Self> {
        let params: CallParams = serde_json::from_value(extract_single_param(params))?;
        let (from, request) = params.into_request_with_from().await?;
        let network = ctx.network().await;

        Ok(SendTransaction {
            network,
            from,
            request,
        })
    }

    async fn run(mut self) -> Result<Json> {
        let result = self.estimate_gas().await.finish().await?;
        Ok(format!("0x{:x}", result.tx_hash()).into())
    }
}

impl SendTransaction {
    async fn estimate_gas(&mut self) -> &mut SendTransaction {
        // TODO: we're defaulting to 1_000_000 gas cost if estimation fails
        // estimation failing means the tx will fail anyway, so this is fine'ish
        // but can probably be improved a lot in the future
        let gas_limit = 1_000_000;

        self.request.set_gas_limit(gas_limit * 120 / 100);
        self
    }

    async fn finish(&mut self) -> Result<PendingTransactionBuilder<Ethereum>> {
        let resolved = self.resolve_wallet().await?;

        let wallet_is_dev = {
            let wallets = Wallets::read().await;
            let wallet = wallets
                .get(&resolved.name)
                .ok_or_else(|| Error::WalletNameNotFound(resolved.name.clone()))?;
            wallet.is_dev()
        };

        let skip = self.network.is_dev().await
            && wallet_is_dev
            && settings()
                .get_all()
                .await
                .map_err(|e| eyre!("{}", e))?
                .fast_mode;

        // skip the dialog if both network & wallet allow for it, and if fast_mode is enabled
        if skip {
            self.send(&resolved).await
        } else {
            self.dialog_and_send(&resolved).await
        }
    }

    async fn resolve_wallet(&self) -> Result<ResolvedWallet> {
        let (wallet, path) = ethui_wallets::find_wallet(self.from)
            .await
            .ok_or(Error::WalletNotFound(self.from))?;

        Ok(ResolvedWallet {
            name: wallet.name(),
            path,
            wallet_type: (&wallet).into(),
        })
    }

    async fn dialog_and_send(
        &mut self,
        resolved: &ResolvedWallet,
    ) -> Result<PendingTransactionBuilder<Ethereum>> {
        let mut params = serde_json::to_value(&self.request).unwrap();
        params["chainId"] = self.network.chain_id().into();
        params["walletType"] = resolved.wallet_type.to_string().into();

        let dialog = Dialog::new("tx-review", params);
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => match &msg["event"].as_str() {
                    Some("simulate") => {
                        dialog.send("trying", None).await?;
                        self.simulate(&dialog, resolved).await?
                    }
                    Some("accept") => break,
                    Some("update") => {
                        self.update(msg);
                        self.simulate(&dialog, resolved).await?
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

        if resolved.wallet_type == WalletType::Ledger {
            dialog.send("check-ledger", None).await?;
        }

        let tx = self.send(resolved).await?;

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

    async fn simulate(&self, dialog: &Dialog, resolved: &ResolvedWallet) -> Result<()> {
        let chain_id = self.network.chain_id();
        let request = self.simulation_request(resolved).await?;

        if let Ok(sim) = ethui_simulator::commands::simulator_run(chain_id, request).await {
            dialog.send("foo", None).await?;
            dialog
                .send("simulation-result", Some(serde_json::to_value(sim)?))
                .await?
        }

        Ok(())
    }

    async fn send(
        &mut self,
        resolved: &ResolvedWallet,
    ) -> Result<PendingTransactionBuilder<Ethereum>> {
        let provider = self.build_provider(resolved).await?;

        ethui_broadcast::transaction_submitted(self.network.chain_id()).await;

        let pending = provider.send_transaction(self.request.clone()).await?;
        Ok(pending)
    }

    async fn build_provider(&mut self, resolved: &ResolvedWallet) -> Result<DynProvider> {
        let wallet = {
            let wallets = Wallets::read().await;
            wallets
                .get(&resolved.name)
                .ok_or(Error::WalletNameNotFound(resolved.name.clone()))?
                .clone()
        };

        let url = self.network.http_url.to_string();
        // .parse()
        // .map_err(|_| Error::CannotParseUrl(self.network.http_url.to_string().clone()))?;

        if self.network.is_dev().await {
            // TODO: maybe we can find a way to only do this once for every account,
            // or only call anvil_autoImpersonate once for the whole network,
            // instead of making this request for every single transaction.
            // this is just a minor optimization, though
            let provider = ProviderBuilder::new().connect(&url).await?.erased();

            let signer = wallet
                .build_signer(self.network.chain_id(), &resolved.path)
                .await?;

            let address = <EthereumWallet as NetworkWallet<Ethereum>>::default_signer_address(
                &signer.to_wallet(),
            );

            provider
                .client()
                .request::<Address, serde_json::Value>("hardhat_impersonateAccount", address)
                .await?;

            Ok(provider)
        } else {
            let signer = wallet
                .build_signer(self.network.chain_id(), &resolved.path)
                .await?;
            let provider = ProviderBuilder::new()
                .wallet(signer.to_wallet())
                .connect(&url)
                .await?
                .erased();
            Ok(provider)
        }
    }

    async fn simulation_request(
        &self,
        resolved: &ResolvedWallet,
    ) -> Result<ethui_simulator::Request> {
        let tx_request = self.request.clone();

        Ok(ethui_simulator::Request {
            from: self.get_from_address(resolved).await?,
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

    async fn get_from_address(&self, resolved: &ResolvedWallet) -> Result<Address> {
        let wallet = {
            let wallets = Wallets::read().await;
            wallets
                .get(&resolved.name)
                .ok_or_else(|| Error::WalletNameNotFound(resolved.name.clone()))?
                .clone()
        };

        wallet
            .get_address(&resolved.path)
            .await
            .map_err(|_| Error::CannotSimulate)
    }
}
