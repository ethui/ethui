use std::collections::HashMap;

use ethers::signers::coins_bip39::English;
use ethers::signers::{MnemonicBuilder, Signer};
use ethers::types::Address;
use ethers::utils::to_checksum;
use ethers_core::k256::ecdsa::SigningKey;
use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Serialize};

use crate::error::Result;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub name: String,
    mnemonic: String,
    pub derivation_path: String,
    pub idx: u32,
    #[serde(skip)]
    pub signer: ethers::signers::Wallet<SigningKey>,
    pub dev: bool,
    pub count: u32,
}

impl Default for Wallet {
    fn default() -> Self {
        let mnemonic = String::from("test test test test test test test test test test test junk");
        let derivation_path = String::from("m/44'/60'/0'/0");
        let idx = 0;

        let signer = MnemonicBuilder::<English>::default()
            .phrase(mnemonic.as_str())
            .derivation_path(&format!("{}/{}", derivation_path, idx))
            .unwrap()
            .build()
            .expect("");

        Self {
            // TODO: wallet name
            name: "test".into(),
            mnemonic,
            derivation_path,
            idx,
            signer,
            dev: true,
            count: 3,
        }
    }
}

impl Wallet {
    pub fn derive_addresses_with_mnemonic(
        mnemonic: &str,
        derivation_path: &str,
        count: u32,
    ) -> Result<Vec<String>> {
        // let mnemonic = Mnemonic::<English>::new_from_phrase(mnemonic)?;
        let builder = MnemonicBuilder::<English>::default().phrase(mnemonic);

        (0..count)
            .map(|idx| -> Result<_> {
                let signer = builder
                    .clone()
                    .derivation_path(&format!("{}/{}", derivation_path, idx))?
                    .build()?;

                Ok(to_checksum(&signer.address(), None))
            })
            .collect()
    }

    pub fn default_key(&self) -> String {
        format!("{}/{}", self.derivation_path, self.idx)
    }

    pub fn derive_all_addresses(&self) -> Result<HashMap<String, ChecksummedAddress>> {
        // let mnemonic = Mnemonic::<English>::new_from_phrase(mnemonic)?;
        let builder = MnemonicBuilder::<English>::default().phrase(self.mnemonic.as_str());

        (0..self.count)
            .map(|idx| -> Result<_> {
                let path = format!("{}/{}", self.derivation_path, idx);

                let signer = builder.clone().derivation_path(&path)?.build()?;

                Ok((path, signer.address().into()))
            })
            .collect()
    }

    pub fn derive_addresses(&self, indexes: u32) -> Result<Vec<String>> {
        Self::derive_addresses_with_mnemonic(&self.mnemonic, &self.derivation_path, indexes)
    }

    pub fn build_signer(
        mnemonic: &str,
        derivation_path: &str,
        idx: u32,
        chain_id: u32,
    ) -> std::result::Result<ethers::signers::Wallet<SigningKey>, String> {
        MnemonicBuilder::<English>::default()
            .phrase(mnemonic)
            .derivation_path(&format!("{}/{}", derivation_path, idx))
            .map_err(|e| e.to_string())?
            .build()
            .map_err(|e| e.to_string())
            .map(|v| v.with_chain_id(chain_id))
    }

    pub fn checksummed_address(&self) -> String {
        to_checksum(&self.signer.address(), None)
    }

    pub fn update_chain_id(&mut self, chain_id: u32) {
        self.signer =
            Self::build_signer(&self.mnemonic, &self.derivation_path, self.idx, chain_id).unwrap();
    }
}

impl<'de> Deserialize<'de> for Wallet {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct WalletVisitor;

        #[derive(Deserialize)]
        #[serde(field_identifier, rename_all = "camelCase")]
        enum Field {
            Name,
            Mnemonic,
            DerivationPath,
            Count,
            Idx,
            Dev,
        }

        impl<'de> Visitor<'de> for WalletVisitor {
            type Value = Wallet;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("struct Wallet")
            }

            fn visit_map<V>(self, mut map: V) -> std::result::Result<Wallet, V::Error>
            where
                V: MapAccess<'de>,
            {
                let mut name = None;
                let mut mnemonic = None;
                let mut derivation_path = None;
                let mut idx = None;
                let mut count = None;
                let mut dev = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Name => {
                            name = Some(map.next_value()?);
                        }
                        Field::Mnemonic => {
                            mnemonic = Some(map.next_value()?);
                        }
                        Field::DerivationPath => {
                            derivation_path = Some(map.next_value()?);
                        }
                        Field::Idx => {
                            idx = Some(map.next_value()?);
                        }
                        Field::Dev => {
                            dev = Some(map.next_value()?);
                        }
                        Field::Count => {
                            count = Some(map.next_value()?);
                        }
                    }
                }

                let name: String = name.ok_or_else(|| de::Error::missing_field("name"))?;
                let mnemonic: String =
                    mnemonic.ok_or_else(|| de::Error::missing_field("mnemonic"))?;
                let derivation_path: String =
                    derivation_path.ok_or_else(|| de::Error::missing_field("derivation_path"))?;
                let idx: u32 = idx.ok_or_else(|| de::Error::missing_field("idx"))?;
                let count: u32 = count.unwrap_or(1);
                let dev: bool = dev.unwrap_or(false);

                // TODO: the chain id needs to be updated right away, if we read the "current
                // chain" from storage in the future
                let signer = Wallet::build_signer(&mnemonic, &derivation_path, idx, 1)
                    .map_err(|_| de::Error::custom("could not build signer"))?;

                Ok(Wallet {
                    // TODO: wallet name
                    name,
                    mnemonic,
                    derivation_path,
                    idx,
                    signer,
                    dev,
                    count,
                })
            }
        }

        const FIELDS: &[&str] = &["mnemonic", "derivation_path", "idx"];
        deserializer.deserialize_struct("Wallet", FIELDS, WalletVisitor)
    }
}

#[derive(Debug, Deserialize)]
pub struct ChecksummedAddress(Address);

impl Serialize for ChecksummedAddress {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&to_checksum(&self.0, None))
    }
}

impl From<Address> for ChecksummedAddress {
    fn from(value: Address) -> Self {
        Self(value)
    }
}
