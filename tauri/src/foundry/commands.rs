use super::FOUNDRY;

#[tauri::command]
pub async fn foundry_get_abi(code: String) -> crate::Result<Option<serde_json::Value>> {
    let foundry = FOUNDRY.read().unwrap();

    Ok(foundry.get_abi_for(code).map(|abi| abi.abi))
    // Ok(foundry.abis_by_codehash.values().cloned().collect())
}
