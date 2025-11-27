use ethui_networks::{GetCurrent, GetLowestDedupId, ValidateChainId, ask, get_network};
use ethui_types::{eyre, Affinity, GlobalState, Network, NetworkId};

use crate::{
    permissions::{Permission, PermissionRequest, RequestedPermission},
    Store,
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

    pub async fn set_affinity(&mut self, affinity: Affinity) -> color_eyre::Result<()> {
        if let Some(ref domain) = self.domain {
            Store::write().await.set_affinity(domain, affinity)?;
        }

        Ok(())
    }

    pub async fn network(&self) -> Network {
        let chain_id = self.chain_id().await;
        get_network(chain_id).await.unwrap()
    }

    pub async fn switch_chain(&mut self, new_chain_id: u32) -> color_eyre::Result<()> {
        if self.chain_id().await == new_chain_id {
            return Ok(());
        }

        if ask(ValidateChainId(new_chain_id)).await.unwrap_or(false) {
            let dedup_id = ask(GetLowestDedupId(new_chain_id)).await.unwrap_or(0);
            match self.get_affinity().await {
                // If affinity is not set, or sticky, update local affinity, and publish event
                Affinity::Unset | Affinity::Sticky(_) => {
                    let internal_id: NetworkId = (new_chain_id, 0u32).into();
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
            Err(eyre!("Invalid chain ID {new_chain_id}"))
        }
    }

    pub async fn chain_id(&self) -> u32 {
        match self.get_affinity().await {
            Affinity::Sticky(dedup_chain_id) => dedup_chain_id.chain_id(),
            _ => ask(GetCurrent).await.map(|n| n.chain_id()).unwrap_or(1),
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

    pub fn revoke_permissions(&mut self, request: PermissionRequest) -> Vec<RequestedPermission> {
        let ret = request.clone().into_request_permissions_result();

        let to_revoke: Vec<_> = request
            .into_permissions(self.domain.clone().unwrap())
            .collect();

        self.permissions.retain(|p| !to_revoke.contains(p));

        ret
    }

    pub fn get_permissions(&self) -> &Vec<Permission> {
        &self.permissions
    }
}
