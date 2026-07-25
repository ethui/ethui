use ethui_networks::{NetworksActorExt as _, networks};
use ethui_types::{Affinity, GlobalState, Network, NetworkId, eyre};

use crate::{
    Store,
    permissions::{Permission, PermissionRequest, RequestedPermission},
};

/// How much a connection is trusted.
///
/// The domain of an untrusted caller lives in [`Ctx::domain`], not in the
/// `Origin` variant: one place for it means the two cannot drift apart.
///
/// `Origin` is the default so that a `Ctx` built without deciding — including
/// every `..Default::default()` — is the restricted one. A new construction
/// site that forgets to set trust loses access, rather than silently granting
/// it.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, serde::Serialize)]
pub enum Trust {
    /// The app's own GUI, or a local process that read the token file off disk.
    Local,

    /// A web page reaching ethui through the extension, or a WalletConnect
    /// session. Cannot see methods registered as local-only.
    #[default]
    Origin,
}

/// Context for a provider connection
///
/// Handles network affinity of this individual connection
/// Affinity is actually stored in `Store` for persistence
#[derive(Debug, Clone, Default)]
pub struct Ctx {
    /// The domain associated with a connection
    pub domain: Option<String>,
    pub permissions: Vec<Permission>,
    pub trust: Trust,
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

        networks()
            .get(chain_id)
            .await
            .expect("networks actor not available")
            .expect("network not found for chain_id")
    }

    pub async fn switch_chain(&mut self, new_chain_id: u64) -> color_eyre::Result<()> {
        if self.chain_id().await == new_chain_id {
            return Ok(());
        }

        let networks = networks();
        if networks.validate_chain_id(new_chain_id).await? {
            let dedup_id = networks.get_lowest_dedup_id(new_chain_id).await?;
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

    pub async fn chain_id(&self) -> u64 {
        match self.get_affinity().await {
            Affinity::Sticky(id) => id.chain_id(),
            _ => networks()
                .get_current()
                .await
                .expect("networks actor not available")
                .chain_id(),
        }
    }

    // TODO: make this itneractive instead of blindly accepting all permissions
    pub fn request_permissions(&mut self, request: PermissionRequest) -> Vec<RequestedPermission> {
        let ret = request.clone().into_request_permissions_result();

        let new_permissions: Vec<_> = request
            .into_permissions(self.domain.clone().unwrap_or_default())
            .collect();

        self.permissions.extend(new_permissions);

        ret
    }

    pub fn revoke_permissions(&mut self, request: PermissionRequest) -> Vec<RequestedPermission> {
        let ret = request.clone().into_request_permissions_result();

        let to_revoke: Vec<_> = request
            .into_permissions(self.domain.clone().unwrap_or_default())
            .collect();

        self.permissions.retain(|p| !to_revoke.contains(p));

        ret
    }

    pub fn get_permissions(&self) -> &Vec<Permission> {
        &self.permissions
    }
}
