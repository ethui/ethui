use iron_networks::{Network, Networks};
use iron_types::{Affinity, GlobalState};

use crate::{Result, Store};

#[derive(Debug, Clone)]
pub struct Ctx {
    pub domain: Option<String>,
}

impl jsonrpc_core::Metadata for Ctx {}

impl Ctx {
    pub fn empty() -> Self {
        Self { domain: None }
    }

    pub async fn get_affinity(&self) -> Affinity {
        if let Some(ref domain) = self.domain {
            Store::read().await.get_affinity(domain)
        } else {
            Default::default()
        }
    }

    pub async fn set_affinity(&self, affinity: Affinity) -> Result<()> {
        if let Some(ref domain) = self.domain {
            Store::write().await.set_affinity(domain, affinity)?;
        }

        Ok(())
    }

    pub async fn network(&self) -> Network {
        let chain_id = self.chain_id().await;

        Networks::read()
            .await
            .get_network(chain_id)
            .unwrap()
            .clone()
    }

    pub async fn chain_id(&self) -> u32 {
        match self.get_affinity().await {
            Affinity::Sticky(chain_id) => chain_id,
            _ => Networks::read().await.get_current().chain_id,
        }
    }
}
