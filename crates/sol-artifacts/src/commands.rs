use std::collections::HashMap;

use ethui_db::Db;
use ethui_types::{Address, Project, TauriResult};

use crate::{
    abi::SolArtifact,
    actor::{SolArtifactsActorExt as _, sol_artifacts, try_sol_artifacts},
};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<SolArtifact>> {
    Ok(sol_artifacts().fetch_abis().await?)
}

#[tauri::command]
pub async fn sol_artifacts_get_projects(
    chain_id: u64,
    dedup_id: i32,
    db: tauri::State<'_, Db>,
) -> TauriResult<Vec<Project>> {
    // Get contracts from DB
    let contracts = db.get_contracts(chain_id, dedup_id).await?;

    // Try to get project roots and artifacts from sol-artifacts actor
    let actor = match try_sol_artifacts() {
        Ok(actor) => actor,
        Err(_) => return Ok(Vec::new()),
    };

    let project_roots = actor.get_projects().await.ok().unwrap_or_default();
    let artifacts = actor.fetch_abis().await.ok().unwrap_or_default();

    // Helper to generate project name from path (use full path, frontend will handle display)
    let make_project_name = |path_str: &str| -> String { path_str.to_string() };

    // Build a map of projects by path (unique key) with their name, git_root, and addresses
    let mut project_map: HashMap<String, (String, Option<String>, Vec<Address>)> = HashMap::new();

    for artifact in artifacts {
        // Find contracts that match this artifact's name
        let matching_addresses: Vec<Address> = contracts
            .iter()
            .filter(|c| c.name.as_ref() == Some(&artifact.name))
            .map(|c| c.address)
            .collect();

        // Get project path (strip /out/ or /artifacts/ directory to get project root)
        let path_str = artifact.path.to_string_lossy();
        let project_path = if let Some(idx) = path_str.find("/out/") {
            path_str[..idx].to_string()
        } else if let Some(idx) = path_str.find("/artifacts/") {
            path_str[..idx].to_string()
        } else {
            path_str.to_string()
        };

        // Generate readable name from path
        let project_name = make_project_name(&project_path);

        // Use path as key to ensure uniqueness, store project name, git_root, and addresses
        project_map
            .entry(project_path.clone())
            .and_modify(|(_, _, addresses)| addresses.extend(matching_addresses.iter().copied()))
            .or_insert((project_name, None, matching_addresses));
    }

    // Add all discovered project roots (even those without artifacts)
    for root in project_roots {
        let path_str = root.contracts_root.to_string_lossy().to_string();
        let project_name = make_project_name(&path_str);
        let git_root = root
            .git_root
            .as_ref()
            .map(|p| p.to_string_lossy().to_string());

        // Use path as key, only add if not already present (or update git_root if it exists)
        project_map
            .entry(path_str)
            .and_modify(|(_, git, _)| {
                if git.is_none() {
                    *git = git_root.clone();
                }
            })
            .or_insert((project_name, git_root, Vec::new()));
    }

    // Convert to Project structs
    let projects: Vec<Project> = project_map
        .into_iter()
        .map(|(path, (name, git_root, addresses))| Project {
            name,
            path,
            git_root,
            addresses,
        })
        .collect();

    // tracing::debug!(
    //     "sol_artifacts_get_projects: returning {} projects: {:?}",
    //     projects.len(),
    //     projects.iter().map(|p| &p.name).collect::<Vec<_>>()
    // );

    Ok(projects)
}
