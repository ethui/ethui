use common::TauriResult;

use crate::{abi::ForgeAbi, actor::{ForgeActorExt as _, forge}};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<ForgeAbi>> {
    Ok(forge().fetch_abis().await?)
}
