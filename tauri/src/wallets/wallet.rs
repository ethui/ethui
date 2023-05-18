use ethers::signers::coins_bip39::English;
use ethers::signers::{MnemonicBuilder, Signer};
use ethers_core::k256::ecdsa::SigningKey;
use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::types::ChecksummedAddress;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub name: String,
    mnemonic: String,
    pub derivation_path: String,
    pub idx: u32,
    pub dev: bool,
    pub count: u32,
    pub current_key: String,
}

impl Default for Wallet {
    fn default() -> Self {
        let mnemonic = String::from("test test test test test test test test test test test junk");
        let derivation_path = String::from("m/44'/60'/0'/0");
        let idx = 0;
        let current_key = format!("{}/{}", derivation_path, idx);

        Self {
            // TODO: wallet name
            name: "test".into(),
            mnemonic,
            derivation_path,
            idx,
            dev: true,
            count: 3,
            current_key,
        }
    }
}

impl Wallet {
    pub fn get_current_address(&self) -> ChecksummedAddress {
        // TODO: where will chain id come from?
        self.build_signer(1).unwrap().address().into()
    }

    pub fn set_current_key(&mut self, key: String) {
        // TODO: check if key is valid
        self.current_key = key;
    }

    pub fn derive_all_addresses(&self) -> Result<Vec<(String, ChecksummedAddress)>> {
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

    pub fn build_signer(
        &self,
        chain_id: u32,
    ) -> std::result::Result<ethers::signers::Wallet<SigningKey>, String> {
        MnemonicBuilder::<English>::default()
            .phrase(self.mnemonic.as_ref())
            .derivation_path(&self.current_key)
            .map_err(|e| e.to_string())?
            .build()
            .map_err(|e| e.to_string())
            .map(|v| v.with_chain_id(chain_id))
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
            CurrentKey,
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
                let mut current_key = None;
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
                        Field::CurrentKey => {
                            current_key = Some(map.next_value()?);
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
                let current_key: String =
                    current_key.unwrap_or(format!("{}/{}", derivation_path, idx));
                let dev: bool = dev.unwrap_or(false);

                Ok(Wallet {
                    // TODO: wallet name
                    name,
                    mnemonic,
                    derivation_path,
                    idx,
                    dev,
                    count,
                    current_key,
                })
            }
        }

        const FIELDS: &[&str] = &["mnemonic", "derivation_path", "idx"];
        deserializer.deserialize_struct("Wallet", FIELDS, WalletVisitor)
    }
}
