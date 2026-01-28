use ethui_types::TauriResult;

use crate::{abi::SolArtifact, actor::{SolArtifactsActorExt as _, sol_artifacts}};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<SolArtifact>> {
    Ok(sol_artifacts().fetch_abis().await?)
}
