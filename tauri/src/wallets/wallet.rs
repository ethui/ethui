use std::str::FromStr;

use coins_bip32::path::DerivationPath;
use ethers::signers::coins_bip39::English;
use ethers::signers::{MnemonicBuilder, Signer};
use ethers_core::k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};

use super::Result;
use crate::types::ChecksummedAddress;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(try_from = "WalletDeserializer", rename_all = "camelCase")]
pub struct Wallet {
    pub name: String,
    mnemonic: String,
    derivation_path: String,
    dev: bool,
    count: u32,
    current_path: String,
}

impl Wallet {
    pub fn get_current_address(&self) -> ChecksummedAddress {
        self.build_signer(1).unwrap().address().into()
    }

    pub fn set_current_path(&mut self, path: &str) -> Result<()> {
        let builder = MnemonicBuilder::<English>::default().phrase(self.mnemonic.as_str());

        match derive_from_builder_and_path(builder, path) {
            Ok(_) => {
                self.current_path = path.to_string();
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    pub fn derive_all_addresses(&self) -> Result<Vec<(String, ChecksummedAddress)>> {
        // let mnemonic = Mnemonic::<English>::new_from_phrase(mnemonic)?;
        let builder = MnemonicBuilder::<English>::default().phrase(self.mnemonic.as_str());

        (0..self.count)
            .map(|idx| -> Result<_> {
                let path = format!("{}/{}", self.derivation_path, idx);
                let address = derive_from_builder_and_path(builder.clone(), &path)?;

                Ok((path, address))
            })
            .collect()
    }

    pub fn build_signer(&self, chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>> {
        Ok(MnemonicBuilder::<English>::default()
            .phrase(self.mnemonic.as_ref())
            .derivation_path(&self.current_path)?
            .build()
            .map(|v| v.with_chain_id(chain_id))?)
    }
}

fn derive_from_builder_and_path(
    builder: MnemonicBuilder<English>,
    path: &str,
) -> Result<ChecksummedAddress> {
    Ok(builder.derivation_path(path)?.build()?.address().into())
}

impl Default for Wallet {
    fn default() -> Self {
        let mnemonic = String::from("test test test test test test test test test test test junk");
        let derivation_path = String::from("m/44'/60'/0'/0");
        let current_path = format!("{derivation_path}/0");

        Self {
            name: "test".into(),
            mnemonic,
            derivation_path,
            dev: true,
            count: 3,
            current_path,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WalletDeserializer {
    name: String,
    mnemonic: String,
    derivation_path: String,
    dev: bool,
    count: u32,
    current_path: Option<String>,
}

#[derive(thiserror::Error, Debug)]
enum WalletDeserializerError {
    #[error(transparent)]
    DerivationPath(#[from] coins_bip32::Bip32Error),
}

/// Deserializes a wallet with some additional_checks ensuring derivation_paths are valid
impl TryFrom<WalletDeserializer> for Wallet {
    type Error = WalletDeserializerError;

    fn try_from(value: WalletDeserializer) -> std::result::Result<Self, Self::Error> {
        // try using given current_path
        let current_path: std::result::Result<DerivationPath, _> = match value.current_path {
            Some(path) => DerivationPath::from_str(&path),
            None => Err(coins_bip32::Bip32Error::MalformattedDerivation(
                value.current_path.unwrap_or_default(),
            )),
        };

        // if current_path is not given or invalid, try to build it from derivation_path
        let current_path: DerivationPath = match current_path {
            Ok(path) => path,
            Err(_) => DerivationPath::from_str(&format!("{}/0", value.derivation_path))?,
        };

        Ok(Self {
            name: value.name,
            mnemonic: value.mnemonic,
            derivation_path: value.derivation_path,
            dev: value.dev,
            count: value.count,
            current_path: current_path.derivation_string(),
        })
    }
}
