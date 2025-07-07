use alloy::providers::Provider as _;
use color_eyre::eyre::{Context as _, ContextCompat as _};
use ethui_db::{
    Db,
    utils::{fetch_etherscan_abi, fetch_etherscan_contract_name},
};
use ethui_forge::GetAbiFor;
use ethui_proxy_detect::ProxyType;
use ethui_types::{Address, GlobalState, TauriResult, UINotify};

#[tauri::command]
pub fn get_build_mode() -> String {
    if cfg!(debug_assertions) {
        "debug".to_string()
    } else {
        "release".to_string()
    }
}

#[tauri::command]
pub fn get_version() -> String {
    std::env!("CARGO_PKG_VERSION").replace('\"', "")
}

#[tauri::command]
pub async fn ui_error(message: String, _stack: Option<Vec<String>>) -> TauriResult<()> {
    tracing::error!(error_type = "UI Error", message = message);

    Ok(())
}

#[tauri::command]
pub async fn add_contract(
    chain_id: u64,
    dedup_id: i64,
    address: Address,
    db: tauri::State<'_, Db>,
) -> TauriResult<()> {
    let networks = ethui_networks::Networks::read().await;

    let network = networks
        .get_network(chain_id as u32)
        .wrap_err_with(|| format!("Invalid network {chain_id}"))?;
    let provider = network.get_alloy_provider().await?;

    let code = provider
        .get_code_at(address)
        .await
        .wrap_err_with(|| format!("Failed to get code at {address}"))?;

    let proxy = ethui_proxy_detect::detect_proxy(address, &provider)
        .await
        .wrap_err_with(|| format!("Failed to detect proxy type for {address}"))?;

    let (name, abi) = if let Some(ProxyType::Eip1167(_)) = proxy {
        // if it's an EIP1167 proxy, there's no ABI to fetch
        (Some("EIP1167".into()), None)
    } else if let Some(abi) = ethui_forge::ask(GetAbiFor(code.clone())).await? {
        // if we have a local match, use that
        (
            Some(abi.name),
            Some(serde_json::to_string(&abi.abi).unwrap()),
        )
    } else if let Ok(Some(fork)) = network.get_forked_network().await {
        (
            fetch_etherscan_contract_name(fork.chain_id.into(), address).await?,
            fetch_etherscan_abi(fork.chain_id.into(), address)
                .await?
                .map(|abi| serde_json::to_string(&abi).unwrap()),
        )
    } else if !network.is_dev().await {
        (
            fetch_etherscan_contract_name(chain_id.into(), address).await?,
            fetch_etherscan_abi(chain_id.into(), address)
                .await?
                .map(|abi| serde_json::to_string(&abi).unwrap()),
        )
    } else {
        (None, None)
    };

    let proxy_for = proxy.map(|proxy| proxy.implementation());

    db.insert_contract_with_abi(
        (chain_id as u32, dedup_id as i32).into(),
        address,
        Some(&code),
        abi,
        name,
        proxy_for,
    )
    .await?;

    if let Some(proxy_for) = proxy_for {
        Box::pin(add_contract(chain_id, dedup_id, proxy_for, db)).await
    } else {
        ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
        Ok(())
    }
}

#[tauri::command]
pub async fn remove_contract(
    chain_id: u32,
    dedup_id: i32,
    address: Address,
    db: tauri::State<'_, Db>,
) -> TauriResult<()> {
    let has_proxy = db.get_proxy(chain_id, dedup_id, address).await;

    db.remove_contract(chain_id, dedup_id, address).await?;

    if let Some(proxy_for) = has_proxy {
        Box::pin(remove_contract(chain_id, dedup_id, proxy_for, db)).await?;
    }

    ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
    Ok(())
}
