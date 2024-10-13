use alloy::primitives::{Address, B256};
use alloy::signers::Signature;
use alloy::signers::{ledger::LedgerSigner, local::LocalSigner};
use async_trait::async_trait;
use coins_bip32::ecdsa;

//use crate::{utils::HID_MUTEX, Error, Result};

#[derive(Debug)]
pub enum Signer {
    Local(LocalSigner<ecdsa::SigningKey>),
    Ledger(LedgerSigner),
}

impl Signer {
    pub fn is_ledger(&self) -> bool {
        match self {
            Self::Local(_) => false,
            Self::Ledger(_) => true,
        }
    }
}

#[async_trait]
impl alloy::signers::Signer<Signature> for Signer {
    fn address(&self) -> Address {
        match self {
            Self::Local(signer) => signer.address(),
            Self::Ledger(signer) => signer.address(),
        }
    }

    fn chain_id(&self) -> Option<u64> {
        match self {
            Self::Local(signer) => signer.chain_id(),
            Self::Ledger(signer) => signer.chain_id(),
        }
    }

    fn set_chain_id(&mut self, chain_id: Option<u64>) {
        match self {
            Self::Local(signer) => signer.set_chain_id(chain_id),
            Self::Ledger(signer) => signer.set_chain_id(chain_id),
        };
    }

    async fn sign_hash(&self, hash: &B256) -> alloy::signers::Result<Signature> {
        match self {
            Self::Local(signer) => signer.sign_hash(hash).await,
            Self::Ledger(signer) => signer.sign_hash(hash).await,
        }
    }
}
