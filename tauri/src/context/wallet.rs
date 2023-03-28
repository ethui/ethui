use ethers::signers::coins_bip39::English;
use ethers::signers::{MnemonicBuilder, Signer};
use ethers::utils::to_checksum;
use ethers_core::k256::ecdsa::SigningKey;
use log::debug;
use serde::de::{self, MapAccess, Visitor};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    mnemonic: String,
    derivation_path: String,
    idx: u32,
    #[serde(skip)]
    pub signer: ethers::signers::Wallet<SigningKey>,
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
            mnemonic,
            derivation_path,
            idx,
            signer,
        }
    }
}

impl Wallet {
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
        debug!("new chain id {}", chain_id);
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
            Mnemonic,
            DerivationPath,
            Idx,
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
                let mut mnemonic = None;
                let mut derivation_path = None;
                let mut idx = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Mnemonic => {
                            mnemonic = Some(map.next_value()?);
                        }
                        Field::DerivationPath => {
                            derivation_path = Some(map.next_value()?);
                        }
                        Field::Idx => {
                            idx = Some(map.next_value()?);
                        }
                    }
                }

                let mnemonic: String =
                    mnemonic.ok_or_else(|| de::Error::missing_field("mnemonic"))?;
                let derivation_path: String =
                    derivation_path.ok_or_else(|| de::Error::missing_field("derivation_path"))?;
                let idx: u32 = idx.ok_or_else(|| de::Error::missing_field("idx"))?;

                // TODO: the chain id needs to be updated right away, if we read the "current
                // chain" from storage in the future
                let signer = Wallet::build_signer(&mnemonic, &derivation_path, idx, 1)
                    .map_err(|_| de::Error::custom("could not build signer"))?;

                Ok(Wallet {
                    mnemonic,
                    derivation_path,
                    idx,
                    signer,
                })
            }
        }

        const FIELDS: &[&str] = &["mnemonic", "derivation_path", "idx"];
        deserializer.deserialize_struct("Wallet", FIELDS, WalletVisitor)
    }
}
