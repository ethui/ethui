use async_trait::async_trait;
use ethui_types::prelude::*;

use crate::{Signer, Wallet, WalletControl, wallet::WalletCreate};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Impersonator {
    pub name: String,
    pub addresses: Vec<Address>,

    #[serde(default)]
    pub current: usize,
}

#[async_trait]
impl WalletCreate for Impersonator {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        let wallet: Self = serde_json::from_value(params)?;
        wallet.check_current_in_range()?;

        Ok(Wallet::Impersonator(wallet))
    }
}

#[async_trait]
impl WalletControl for Impersonator {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }

        if !params["addresses"].is_null() {
            self.addresses = serde_json::from_value(params["addresses"].clone())?;
        }

        if let Some(current) = params["current"].as_u64() {
            self.current = current as usize;
        }

        self.check_current_in_range()?;

        Ok(Wallet::Impersonator(self))
    }

    async fn get_current_address(&self) -> Address {
        self.addresses[self.current]
    }

    fn get_current_path(&self) -> String {
        self.current.to_string()
    }

    async fn set_current_path(&mut self, path: String) -> color_eyre::Result<()> {
        let current = usize::from_str(&path)?;
        if current >= self.addresses.len() {
            return Err(eyre!("unknown wallet key: {path}"));
        }

        self.current = current;
        Ok(())
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses
            .iter()
            .enumerate()
            .map(|(i, v)| (i.to_string(), *v))
            .collect()
    }

    async fn get_address(&self, path: &str) -> color_eyre::Result<Address> {
        self.addresses
            .get(usize::from_str(path)?)
            .copied()
            .with_context(|| format!("unknown wallet key: {path}"))
    }

    fn is_dev(&self) -> bool {
        true
    }

    async fn build_signer(&self, _chain_id: u64, _path: &str) -> color_eyre::Result<Signer> {
        Err(eyre!("This wallet type cannot sign"))
    }
}

impl Impersonator {
    /// `get_current_address` indexes `addresses` directly, so a wallet whose
    /// `current` is out of range — including one with no addresses at all —
    /// panics as soon as anything lists it. Rejected at construction instead.
    fn check_current_in_range(&self) -> color_eyre::Result<()> {
        if self.addresses.is_empty() {
            return Err(eyre!("a wallet needs at least one address"));
        }

        if self.current >= self.addresses.len() {
            return Err(eyre!(
                "current index {} is out of range for {} addresses",
                self.current,
                self.addresses.len()
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn an_empty_address_list_is_rejected() {
        let err = Impersonator::create(json!({
            "type": "impersonator",
            "name": "test",
            "addresses": [],
        }))
        .await
        .unwrap_err();

        assert!(
            err.to_string().contains("at least one address"),
            "expected an empty-address error, got {err}"
        );
    }

    #[tokio::test]
    async fn an_out_of_range_current_is_rejected() {
        let err = Impersonator::create(json!({
            "type": "impersonator",
            "name": "test",
            "addresses": ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
            "current": 4,
        }))
        .await
        .unwrap_err();

        assert!(
            err.to_string().contains("out of range"),
            "expected a range error, got {err}"
        );
    }
}
