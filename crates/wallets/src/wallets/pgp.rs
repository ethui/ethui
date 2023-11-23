pub(crate) use std::path::PathBuf;

use async_trait::async_trait;
use ethers::signers::{coins_bip39::English, MnemonicBuilder, Signer as _};
use iron_types::Address;

use crate::{
    utils::{self, read_pgp_secret},
    wallet::WalletCreate,
    Error, Result, Signer, Wallet, WalletControl,
};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PGPWallet {
    name: String,
    file: PathBuf,
    derivation_path: String,
    count: u32,
    current: (String, Address),
    addresses: Vec<(String, Address)>,
}

#[async_trait]
impl WalletCreate for PGPWallet {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::PGPWallet(
            Self::from_params(serde_json::from_value(params)?).await?,
        ))
    }
}

#[async_trait]
impl WalletControl for PGPWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }
        if let Some(path) = params["derivationPath"].as_str() {
            self.update_derivation_path(path.into()).await?;
        }
        if let Some(count) = params["count"].as_u64() {
            self.update_count(count as u32).await?;
        }

        Ok(Wallet::PGPWallet(self))
    }

    async fn get_current_address(&self) -> Address {
        self.current.1
    }

    fn get_current_path(&self) -> String {
        self.current.0.clone()
    }

    async fn set_current_path(&mut self, path: String) -> Result<()> {
        self.current = self
            .addresses
            .iter()
            .find(|(p, _)| p == &path)
            .cloned()
            .ok_or(Error::InvalidKey(path))?;

        Ok(())
    }

    async fn get_address(&self, path: &str) -> Result<Address> {
        self.addresses
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, a)| *a)
            .ok_or(Error::InvalidKey(path.into()))
    }

    async fn build_signer(&self, chain_id: u32, path: &str) -> Result<Signer> {
        let mnemonic: String = read_pgp_secret(&self.file)?;

        let signer = MnemonicBuilder::<English>::default()
            .phrase(mnemonic.as_str())
            .derivation_path(path)?
            .build()?;

        Ok(Signer::SigningKey(signer.with_chain_id(chain_id)))
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses.clone()
    }
}

impl PGPWallet {
    pub async fn from_params(params: PGPWalletParams) -> Result<Self> {
        let mnemonic: String = read_pgp_secret(&params.file)?;
        let addresses = utils::derive_addresses(&mnemonic, &params.derivation_path, params.count);

        let current = if let Some(current) = addresses.iter().find(|(p, _)| p == &params.current) {
            current.clone()
        } else {
            return Err(Error::InvalidKey(params.current));
        };

        Ok(Self {
            name: params.name,
            file: params.file,
            derivation_path: params.derivation_path,
            addresses,
            current,
            count: params.count,
        })
    }

    async fn update_derivation_path(&mut self, derivation_path: String) -> Result<()> {
        self.derivation_path = derivation_path;

        self.update_derived_addresses().await?;

        Ok(())
    }

    async fn update_count(&mut self, count: u32) -> Result<()> {
        self.count = count;

        self.update_derived_addresses().await?;

        Ok(())
    }

    async fn is_unlocked(&self) -> bool {
        todo!()
    }

    async fn unlock(&self) -> Result<()> {
        todo!()
    }

    async fn update_derived_addresses(&mut self) -> Result<()> {
        let mnemonic: String = read_pgp_secret(&self.file)?;

        let addresses = utils::derive_addresses(&mnemonic, &self.derivation_path, self.count);
        let current = addresses.first().unwrap().clone();

        self.current = current;
        self.addresses = addresses;

        Ok(())
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PGPWalletParams {
    name: String,
    file: PathBuf,
    derivation_path: String,
    current: String,
    count: u32,
}
