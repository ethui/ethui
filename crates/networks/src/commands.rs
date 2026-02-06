use ethui_types::{NewNetworkParams, prelude::*};

use crate::actor::{NetworksActorExt as _, networks};

#[tauri::command]
pub async fn networks_get_current() -> TauriResult<Network> {
    Ok(networks().get_current().await?)
}

#[tauri::command]
pub async fn networks_get_list() -> TauriResult<Vec<Network>> {
    Ok(networks().get_list().await?)
}

#[tauri::command]
pub async fn networks_set_current(name: String) -> TauriResult<Network> {
    let networks = networks();
    networks.set_current(name).await?;
    Ok(networks.get_current().await?)
}

#[tauri::command]
pub async fn networks_add(network: NewNetworkParams) -> TauriResult<()> {
    Ok(networks().add(network).await?)
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> TauriResult<()> {
    Ok(networks().update(old_name, network).await?)
}

#[tauri::command]
pub async fn networks_remove(name: String) -> TauriResult<()> {
    Ok(networks().remove(name).await?)
}

#[tauri::command]
pub async fn networks_is_dev(id: NetworkId) -> TauriResult<bool> {
    let network = networks()
        .get(id)
        .await?
        .with_context(|| "Network not found")?;

    Ok(network.is_dev().await?)
}

#[tauri::command]
pub async fn networks_chain_id_from_provider(url: String) -> TauriResult<u64> {
    use alloy::providers::{Provider, ProviderBuilder};
    use url::{Host, Url};

    fn validate_provider_url(url: &str) -> Result<Url> {
        let parsed = Url::parse(url).wrap_err_with(|| format!("Invalid provider URL: {url}"))?;

        match parsed.scheme() {
            "http" | "https" => {}
            _ => return Err(eyre!("Provider URL must use http or https scheme")),
        }

        let host = parsed
            .host()
            .ok_or_else(|| eyre!("Provider URL must include a host"))?;

        let ip = match host {
            Host::Ipv4(ip) => Some(std::net::IpAddr::V4(ip)),
            Host::Ipv6(ip) => Some(std::net::IpAddr::V6(ip)),
            Host::Domain(_) => None,
        };

        if let Some(ip) = ip {
            if ip.is_private() || ip.is_loopback() || ip.is_link_local() || ip.is_unspecified() {
                return Err(eyre!("Provider URL host must be a public IP address"));
            }
        }

        Ok(parsed)
    }

    let provider_url = validate_provider_url(&url)?;

    let provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect(provider_url.as_str())
        .await
        .with_context(|| format!("Failed to connect to provider at {url}"))?;

    Ok(provider
        .get_chain_id()
        .await
        .with_context(|| format!("Failed to get chain ID from provider at {url}"))?)
}
