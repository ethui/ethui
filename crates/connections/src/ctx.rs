use ethui_networks::{Network, Networks};
use ethui_types::{Affinity, GlobalState};

use crate::{Error, Result, Store};

/// Context for a provider connection
///
/// Handles network affinity of this individual connection
/// Affinity is actually stored in `Store` for persistence
#[derive(Debug, Clone)]
pub struct Ctx {
    /// The domain associated with a connection
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

    pub async fn set_affinity(&mut self, affinity: Affinity) -> Result<()> {
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

    pub async fn switch_chain(&mut self, new_chain_id: u32) -> Result<()> {
        if self.chain_id().await == new_chain_id {
            return Ok(());
        }

        if Networks::read().await.validate_chain_id(new_chain_id) {
            match self.get_affinity().await {
                // If affinity is not set, or sticky, update local affinity, and publish event
                Affinity::Unset | Affinity::Sticky(_) => {
                    let affinity = new_chain_id.into();
                    self.set_affinity(affinity).await?;

                    ethui_broadcast::chain_changed(new_chain_id, self.domain.clone(), affinity)
                        .await;
                }

                // If current affinity is global, there's nothing to update on this Ctx, and the
                // domain is irrelevant in the update,
                Affinity::Global => {
                    ethui_broadcast::chain_changed(new_chain_id, None, Affinity::Global).await;
                }
            };

            Ok(())
        } else {
            Err(Error::InvalidChainId(new_chain_id))
        }
    }

    pub async fn chain_id(&self) -> u32 {
        match self.get_affinity().await {
            Affinity::Sticky(chain_id) => chain_id,
            _ => Networks::read().await.get_current().chain_id,
        }
    }
}
