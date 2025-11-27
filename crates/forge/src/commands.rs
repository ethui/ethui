use ethui_types::TauriResult;

use crate::{abi::ForgeAbi, actor::*};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<ForgeAbi>> {
    Ok(forge().ask(FetchAbis).await?)
}
