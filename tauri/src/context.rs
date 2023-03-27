use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::Arc;

use ethers::signers::coins_bip39::English;
use ethers::signers::{MnemonicBuilder, Signer};
use ethers::utils::to_checksum;
use ethers_core::k256::ecdsa::SigningKey;
use futures_util::lock::{Mutex, MutexGuard, MutexLockFuture};
use log::info;
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct Context(Arc<Mutex<ContextInner>>);
pub type UnlockedContext<'a> = MutexGuard<'a, ContextInner>;

impl Context {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(ContextInner::new())))
    }

    pub fn lock(&self) -> MutexLockFuture<'_, ContextInner> {
        self.0.lock()
    }
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct ContextInner {
    pub wallet: Wallet,
    pub current_network: String,
    pub networks: HashMap<String, Network>,
    #[serde(skip)]
    pub peers: HashMap<SocketAddr, mpsc::UnboundedSender<serde_json::Value>>,
}

impl ContextInner {
    pub fn new() -> Self {
        let mut networks = HashMap::new();
        networks.insert(String::from("mainnet"), Network::mainnet());
        networks.insert(String::from("goerli"), Network::goerli());
        networks.insert(String::from("anvil"), Network::anvil());

        Self {
            wallet: Wallet::default(),
            current_network: String::from("mainnet"),
            networks,
            ..Default::default()
        }
    }

    pub fn add_peer(&mut self, peer: SocketAddr, snd: mpsc::UnboundedSender<serde_json::Value>) {
        self.peers.insert(peer, snd);
    }

    pub fn remove_peer(&mut self, peer: SocketAddr) {
        self.peers.remove(&peer);
    }

    pub fn broadcast<T: Serialize + std::fmt::Debug>(&self, msg: T) {
        info!("Broadcasting message: {:?}", msg);

        self.peers.iter().for_each(|(_, sender)| {
            sender.send(serde_json::to_value(&msg).unwrap()).unwrap();
        });
    }

    pub fn set_wallet(&mut self, wallet: Wallet) {
        self.wallet = wallet;
    }

    pub fn set_current_network(&mut self, new_current_network: String) {
        self.current_network = new_current_network;

        let network = self.networks.get(&self.current_network).unwrap().clone();

        self.broadcast(json!({
            "method": "chainChanged",
            "params": {
                "chainId": format!("0x{:x}", network.chain_id),
                "networkVersion": network.name
            }
        }));
    }

    pub fn set_current_network_by_id(&mut self, new_chain_id: u32) {
        let new_network = self
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_network(new_network.name.clone())
    }

    pub fn set_networks(&mut self, networks: Vec<Network>) {
        self.networks = networks.into_iter().map(|n| (n.name.clone(), n)).collect();
    }

    pub fn get_current_network(&self) -> Network {
        self.networks.get(&self.current_network).unwrap().clone()
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct Wallet {
    mnemonic: String,
    derivation_path: String,
    idx: u32,
    #[serde(skip)]
    signer: ethers::signers::Wallet<SigningKey>,
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
    ) -> Result<ethers::signers::Wallet<SigningKey>, String> {
        MnemonicBuilder::<English>::default()
            .phrase(mnemonic)
            .derivation_path(&format!("{}/{}", derivation_path, idx))
            .map_err(|e| e.to_string())?
            .build()
            .map_err(|e| e.to_string())
    }

    pub fn address(&self) -> String {
        to_checksum(&self.signer.address(), None)
    }
}

use serde::de::{self, MapAccess, Visitor};
use serde_json::json;
use tokio::sync::mpsc;

impl<'de> Deserialize<'de> for Wallet {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct WalletVisitor;

        #[derive(Deserialize)]
        #[serde(field_identifier, rename_all = "lowercase")]
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

                let signer = Wallet::build_signer(&mnemonic, &derivation_path, idx)
                    .map_err(|_| de::Error::custom("could not build signer"))?;

                Ok(Wallet {
                    mnemonic,
                    derivation_path,
                    idx,
                    signer,
                })
            }
        }

        const FIELDS: &'static [&'static str] = &["mnemonic", "derivation_path", "idx"];
        deserializer.deserialize_struct("Wallet", FIELDS, WalletVisitor)
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Network {
    pub name: String,
    pub chain_id: u32,
    pub rpc_url: String,
    pub currency: String,
    pub decimals: u32,
}

impl Network {
    pub fn mainnet() -> Self {
        Self {
            name: String::from("mainnet"),
            chain_id: 1,
            rpc_url: String::from(
                "https://eth-mainnet.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs",
            ),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn goerli() -> Self {
        Self {
            name: String::from("goerli"),
            chain_id: 5,
            rpc_url: String::from(
                "https://eth-goerli.g.alchemy.com/v2/rTwL6BTDDWkP3tZJUc_N6shfCSR5hsTs",
            ),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn anvil() -> Self {
        Self {
            name: String::from("anvil"),
            chain_id: 31337,
            rpc_url: String::from("http://localhost:8545"),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn chain_id_hex(&self) -> String {
        format!("0x{:x}", self.chain_id)
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id, self.name)
    }
}
