use ethui_types::Address;
use relay_rpc::domain::Topic;
use serde::{Deserialize, Serialize};

/// Metadata about the connected dApp.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DappMetadata {
    pub name: String,
    pub url: String,
    pub icons: Vec<String>,
}

/// An active WalletConnect v2 session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Relay topic for this session. Messages arrive and are published here.
    #[serde(with = "topic_serde")]
    pub topic: Topic,

    /// ChaCha20-Poly1305 symmetric key used to encrypt/decrypt all session messages.
    /// Never serialized — `Session` is returned to the frontend via
    /// `wc_list_sessions`, and this key must never leave the backend.
    #[serde(skip)]
    pub sym_key: [u8; 32],

    /// Metadata of the dApp that initiated the connection.
    pub peer: DappMetadata,

    /// Methods the dApp is allowed to call (from requiredNamespaces).
    pub allowed_methods: Vec<String>,

    /// `eip155:<chainId>` identifiers requested by the dApp (or `eip155:1` if none).
    pub chains: Vec<String>,

    /// The account currently exposed to the dApp for this session.
    pub address: Address,

    /// Unix timestamp when the session expires.
    pub expiry: u64,
}

mod topic_serde {
    use relay_rpc::domain::Topic;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(topic: &Topic, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(topic.as_ref())
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Topic, D::Error> {
        let s = String::deserialize(d)?;
        Ok(Topic::from(s.as_str()))
    }
}
