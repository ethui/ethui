use super::FOUNDRY;

/// Gets the ABI, if known, for a given deployed_code_hash
#[tauri::command]
pub async fn foundry_get_abi(
    deployed_code_hash: String,
) -> Result<Option<serde_json::Value>, String> {
    let foundry = FOUNDRY.read().await;

    Ok(foundry
        .get_abi_for(deployed_code_hash.parse().unwrap())
        .map(|abi| abi.abi))
}
