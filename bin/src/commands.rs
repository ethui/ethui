use alloy::providers::Provider as _;
use color_eyre::eyre::ContextCompat as _;
use ethui_db::{
    utils::{fetch_etherscan_abi, fetch_etherscan_contract_name},
    Db,
};
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
    async fn inner(
        chain_id: u64,
        dedup_id: i64,
        address: Address,
        db: tauri::State<'_, Db>,
    ) -> color_eyre::Result<()> {
        let networks = ethui_networks::Networks::read().await;

        let network = networks
            .get_network(chain_id as u32)
            .with_context(|| format!("Invalid network: {chain_id}"))?;
        let provider = network.get_alloy_provider().await?;

        let code = provider.get_code_at(address).await?;
        let proxy = ethui_proxy_detect::detect_proxy(address, &provider).await?;
        let network_is_dev = network.is_dev().await;

        let (name, abi) = if network_is_dev {
            (None, None)
        } else {
            match proxy {
                // Eip1166 minimal proxies don't have an ABI, and etherscan actually returns the implementation's ABI in this case, which we don't want
                Some(ProxyType::Eip1167(_)) => (Some("EIP1167".to_string()), None),
                _ => (
                    fetch_etherscan_contract_name(chain_id.into(), address).await?,
                    fetch_etherscan_abi(chain_id.into(), address)
                        .await?
                        .map(|abi| serde_json::to_string(&abi).unwrap()),
                ),
            }
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
            Box::pin(inner(chain_id, dedup_id, proxy_for, db)).await
        } else {
            ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
            Ok(())
        }
    }

    Ok(inner(chain_id, dedup_id, address, db).await?)
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
