use std::collections::HashMap;

use ethui_db::Db;
use ethui_types::{ContractWithProject, ProjectMetadata, TauriResult};

use crate::{
    abi::SolArtifact,
    actor::{try_sol_artifacts, SolArtifactsActorExt as _, sol_artifacts},
};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<SolArtifact>> {
    Ok(sol_artifacts().fetch_abis().await?)
}

#[tauri::command]
pub async fn db_get_contracts_with_project_metadata(
    chain_id: u64,
    dedup_id: i32,
    db: tauri::State<'_, Db>,
) -> TauriResult<Vec<ContractWithProject>> {
    // Get contracts from DB
    let contracts = db.get_contracts(chain_id, dedup_id).await?;

    // Try to get artifacts from sol-artifacts actor
    let artifacts = match try_sol_artifacts() {
        Ok(actor) => actor.fetch_abis().await.ok().unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    // Build lookup HashMap from artifact name to project metadata
    let mut artifact_map: HashMap<String, ProjectMetadata> = HashMap::new();
    for artifact in artifacts {
        artifact_map.insert(
            artifact.name.clone(),
            ProjectMetadata {
                project_name: Some(artifact.project.clone()),
                project_path: Some(artifact.path.to_string_lossy().to_string()),
            },
        );
    }

    // Enrich each contract with project metadata
    let enriched_contracts: Vec<ContractWithProject> = contracts
        .into_iter()
        .map(|contract| {
            let project = contract
                .name
                .as_ref()
                .and_then(|name| artifact_map.get(name).cloned())
                .unwrap_or_default();

            ContractWithProject { contract, project }
        })
        .collect();

    Ok(enriched_contracts)
}
