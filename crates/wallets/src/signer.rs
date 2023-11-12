use async_trait::async_trait;
use ethers::types::{
    transaction::{eip2718::TypedTransaction, eip712::Eip712},
    Signature, H160,
};

use crate::{Error, Result};

#[derive(Debug)]
pub enum Signer {
    SigningKey(ethers::signers::Wallet<ethers::core::k256::ecdsa::SigningKey>),
    Ledger(ethers::signers::Ledger),
}

impl Signer {
    pub fn is_ledger(&self) -> bool {
        match self {
            Self::SigningKey(_) => false,
            Self::Ledger(_) => true,
        }
    }
}

#[async_trait]
impl ethers::signers::Signer for Signer {
    type Error = crate::Error;

    async fn sign_transaction(&self, message: &TypedTransaction) -> Result<Signature> {
        match self {
            Self::SigningKey(signer) => Ok(signer.sign_transaction(message).await?),
            Self::Ledger(signer) => Ok(signer
                .sign_transaction(message)
                .await
                .map_err(|e| Error::Ledger(e.to_string()))?),
        }
    }

    async fn sign_message<S>(&self, message: S) -> Result<Signature>
    where
        S: AsRef<[u8]> + Send + Sync,
    {
        match self {
            Self::SigningKey(signer) => Ok(signer.sign_message(message).await?),
            Self::Ledger(signer) => Ok(signer
                .sign_message(message)
                .await
                .map_err(|e| Error::Ledger(e.to_string()))?),
        }
    }

    async fn sign_typed_data<T>(&self, payload: &T) -> Result<Signature>
    where
        T: Eip712 + Send + Sync,
    {
        match self {
            Self::SigningKey(signer) => Ok(signer.sign_typed_data(payload).await?),
            Self::Ledger(signer) => Ok(signer
                .sign_typed_data(payload)
                .await
                .map_err(|e| Error::Ledger(e.to_string()))?),
        }
    }

    fn address(&self) -> H160 {
        match self {
            Self::SigningKey(signer) => signer.address(),
            Self::Ledger(signer) => signer.address(),
        }
    }
    fn chain_id(&self) -> u64 {
        match self {
            Self::SigningKey(signer) => signer.chain_id(),
            Self::Ledger(signer) => signer.chain_id(),
        }
    }

    fn with_chain_id<T>(self, chain_id: T) -> Self
    where
        T: Into<u64>,
    {
        match self {
            Self::SigningKey(signer) => Self::SigningKey(signer.with_chain_id(chain_id)),
            Self::Ledger(signer) => Self::Ledger(signer.with_chain_id(chain_id)),
        }
    }
}
