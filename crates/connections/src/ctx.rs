use ethui_networks::Networks;
use ethui_types::{Affinity, DedupChainId, GlobalState, Network};

use crate::{
    permissions::{Permission, PermissionRequest, RequestedPermission},
    Error, Result, Store,
};

/// Context for a provider connection
///
/// Handles network affinity of this individual connection
/// Affinity is actually stored in `Store` for persistence
#[derive(Debug, Clone, Default)]
pub struct Ctx {
    /// The domain associated with a connection
    pub domain: Option<String>,
    pub permissions: Vec<Permission>,
}

impl jsonrpc_core::Metadata for Ctx {}

impl Ctx {
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
            let dedup_id = Networks::read().await.get_lowest_dedup_id(new_chain_id);
            match self.get_affinity().await {
                // If affinity is not set, or sticky, update local affinity, and publish event
                Affinity::Unset | Affinity::Sticky(_) => {
                    let internal_id: DedupChainId = (new_chain_id, 0).into();
                    let affinity = internal_id.into();
                    self.set_affinity(affinity).await?;

                    ethui_broadcast::chain_changed(internal_id, self.domain.clone(), affinity)
                        .await;
                }

                // If current affinity is global, there's nothing to update on this Ctx, and the
                // domain is irrelevant in the update,
                Affinity::Global => {
                    ethui_broadcast::chain_changed(
                        (new_chain_id, dedup_id).into(),
                        None,
                        Affinity::Global,
                    )
                    .await;
                }
            };

            Ok(())
        } else {
            Err(Error::InvalidChainId(new_chain_id))
        }
    }

    pub async fn chain_id(&self) -> u32 {
        match self.get_affinity().await {
            Affinity::Sticky(dedup_chain_id) => dedup_chain_id.chain_id(),
            _ => Networks::read().await.get_current().chain_id,
        }
    }

    // TODO: make this itneractive instead of blindly accepting all permissions
    pub fn request_permissions(&mut self, request: PermissionRequest) -> Vec<RequestedPermission> {
        let ret = request.clone().into_request_permissions_result();

        let new_permissions: Vec<_> = request
            .into_permissions(self.domain.clone().unwrap())
            .collect();

        self.permissions.extend(new_permissions);

        ret
    }

    pub fn get_permissions(&self) -> &Vec<Permission> {
        &self.permissions
    }
}
