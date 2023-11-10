pub(crate) use std::path::PathBuf;

use async_trait::async_trait;
use ethers::{core::k256::ecdsa::SigningKey, signers};
use iron_types::Address;

use super::{wallet::WalletCreate, Error, Result, Wallet, WalletControl};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Pgp {
    name: String,
    file: PathBuf,
    addresses: Vec<(String, Address)>,
    current: usize,
}

#[async_trait]
impl WalletCreate for Pgp {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::Pgp(
            Self::from_params(serde_json::from_value(params)?).await?,
        ))
    }
}

#[async_trait]
impl WalletControl for Pgp {
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

        Ok(Wallet::Pgp(self))
    }

    async fn get_current_address(&self) -> Address {
        self.adddresses.get(self.current).unwrap().1
    }

    fn get_current_path(&self) -> String {
        self.addresses.get(self.current).unwrap().0.clone()
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

    async fn build_signer(&self, chain_id: u32, path: &str) -> Result<signers::Wallet<SigningKey>> {
        let mnemonic = read_secret(&params.file)?;

        let signer = MnemonicBuilder::<English>::default()
            .phrase(mnemonic.as_str())
            .derivation_path(path)?
            .build()?;

        Ok(signer.with_chain_id(chain_id))
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses.clone()
    }
}

impl Pgp {
    pub async fn from_params(params: PgpParams) -> Result<Self> {
        let mnemonic = read_secret(&params.file)?;
        let addresses = utils::derive_addresses(&mnemonic,&params.derivation_path, params.count);

        let current = if let Some(current) = addresses.iter().find(|(p, _)| p == &params.current) {
            current.clone()
        } else {
            return Err(Error::InvalidKey(params.current));
        };

        Ok(Self{
            name: params.name,
            file: params.file,
            addresses,
            derivation_path: params.derivation_path,
        })
        todo!()
    }

    async fn update_derivation_path(&mut self, derivation_path: String) -> Result<()> {
        todo!()
    }

    async fn update_count(&mut self, count: u32) -> Result<()> {
        self.update_derived_addresses(count).await?;

        Ok(())
    }

    async fn is_unlocked(&self) -> bool {
        todo!()
    }

    async fn unlock(&self) -> Result<()> {
        todo!()
    }

    async fn update_derived_addresses(&self, count: u32) -> Result<()> {
        todo!()
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PgpParams {
    file: PathBuf,
    derivation_path: String,
    count: u32,
}

fn read_secret(path: &PathBuf) -> Result<String> {
    let mut ctx = gpgme::Context::from_protocol(gpgme::Protocol::OpenPgp)?;

    let mut input = std::fs::File::open(path.to_string())?;
    let mut output = vec![];
    ctx.decrypt(&mut input, &mut output)?;

    Ok(output.to_string())
}
