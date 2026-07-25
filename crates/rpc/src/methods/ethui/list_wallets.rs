use ethui_connections::Ctx;
use ethui_types::prelude::*;
use ethui_wallets::{WalletControl as _, Wallets};
use jsonrpc_core::Params as RpcParams;
use serde::Serialize;

use crate::{Result, methods::Method};

/// Lists wallets for a local caller.
///
/// Deliberately a projection rather than `Wallets::get_all()`, whose `Wallet`
/// values serialize the things that must never leave the process:
/// `PlaintextWallet` carries its mnemonic in the clear, `HDWallet` and
/// `PrivateKeyWallet` their ciphertext, `JsonKeystoreWallet` a filesystem path.
/// Anything added here has to be something we would hand out deliberately.
#[derive(Debug)]
pub(crate) struct ListWallets;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WalletSummary {
    name: String,
    #[serde(rename = "type")]
    wallet_type: &'static str,
    current_address: Address,
    paths: Vec<PathSummary>,
}

#[derive(Debug, Serialize)]
struct PathSummary {
    key: String,
    address: Address,
}

impl Method for ListWallets {
    async fn build(_params: RpcParams, _ctx: Ctx) -> Result<Self> {
        Ok(Self)
    }

    async fn run(self) -> Result<Json> {
        let wallets = Wallets::read().await;

        let mut summaries = Vec::new();
        for wallet in wallets.get_all().iter() {
            summaries.push(WalletSummary {
                name: wallet.name(),
                wallet_type: wallet.wallet_type(),
                current_address: wallet.get_current_address().await,
                paths: wallet
                    .get_all_addresses()
                    .await
                    .into_iter()
                    .map(|(key, address)| PathSummary { key, address })
                    .collect(),
            });
        }

        Ok(json!(summaries))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The whole reason this type exists. If someone ever swaps `WalletSummary`
    /// back for `Wallet` because it is "the same data", this fails instead of
    /// quietly putting seed phrases on the wire.
    #[test]
    fn a_summary_carries_no_secret_material() {
        let summary = WalletSummary {
            name: "dev".into(),
            wallet_type: "HDWallet",
            current_address: Address::ZERO,
            paths: vec![PathSummary {
                key: "m/44'/60'/0'/0/0".into(),
                address: Address::ZERO,
            }],
        };

        let rendered = serde_json::to_string(&summary).unwrap();

        for forbidden in ["mnemonic", "ciphertext", "privateKey", "file", "password"] {
            assert!(
                !rendered.contains(forbidden),
                "{forbidden} must never appear in a wallet summary; got {rendered}"
            );
        }
    }
}
