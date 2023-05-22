use ethers::signers::coins_bip39::English;
use ethers::signers::{MnemonicBuilder, Signer};
use ethers_core::k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};

use super::{Result, WalletControl};
use crate::types::ChecksummedAddress;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlaintextWallet {
    name: String,
    mnemonic: String,
    #[serde(default = "default_derivation_path")]
    derivation_path: String,
    dev: bool,
    count: u32,
    #[serde(default = "default_current_path")]
    current_path: String,
}

impl PlaintextWallet {}

#[async_trait::async_trait]
impl WalletControl for PlaintextWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn get_current_address(&self) -> ChecksummedAddress {
        self.build_signer(1).await.unwrap().address().into()
    }

    async fn set_current_path(&mut self, path: &str) -> Result<()> {
        let builder = MnemonicBuilder::<English>::default().phrase(self.mnemonic.as_str());

        match derive_from_builder_and_path(builder, path) {
            Ok(_) => {
                self.current_path = path.to_string();
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    async fn build_signer(&self, chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>> {
        Ok(MnemonicBuilder::<English>::default()
            .phrase(self.mnemonic.as_ref())
            .derivation_path(&self.current_path)?
            .build()
            .map(|v| v.with_chain_id(chain_id))?)
    }

    async fn derive_all_addresses(&self) -> Result<Vec<(String, ChecksummedAddress)>> {
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
}

fn derive_from_builder_and_path(
    builder: MnemonicBuilder<English>,
    path: &str,
) -> Result<ChecksummedAddress> {
    Ok(builder.derivation_path(path)?.build()?.address().into())
}

impl Default for PlaintextWallet {
    fn default() -> Self {
        let mnemonic = String::from("test test test test test test test test test test test junk");
        let derivation_path = String::from("m/44'/60'/0'/0");
        let current_path = format!("{}/{}", derivation_path, 0);

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

fn default_derivation_path() -> String {
    "m/44'/60'/0'/0/0".to_string()
}

fn default_current_path() -> String {
    format!("{}/0", default_derivation_path())
}
