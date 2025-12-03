use broadcast::{stack_network_add, stack_network_remove};
use common::{NewNetworkParams, TauriResult};
use tauri::command;
use url::Url;

use crate::{
    actor::{RuntimeStateResponse, StacksActorExt, stacks},
    utils,
};

#[command]
pub async fn stacks_create(slug: String) -> TauriResult<()> {
    let slug = slug.to_lowercase();

    stacks().create_stack(slug.clone()).await?;

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let (port, _) = stacks().get_config().await?;

    let rpc_url = format!("http://{}.local.ethui.dev:{}", slug, port);
    let chain_id = utils::get_chain_id(&rpc_url).await?;

    let explorer_url = format!("http://{}.local.ethui.dev:{}", slug, port);

    let network_params = NewNetworkParams {
        name: slug.clone(),
        chain_id,
        explorer_url: Some(explorer_url),
        http_url: Url::parse(&rpc_url).unwrap(),
        ws_url: None,
        currency: "ETH".to_string(),
        decimals: 18,
        is_stack: true,
    };

    stack_network_add(network_params).await;

    Ok(())
}

#[command]
pub async fn stacks_list() -> TauriResult<Vec<String>> {
    let stacks = stacks().list_stacks().await?;
    Ok(stacks)
}

#[command]
pub async fn stacks_get_status(slug: String) -> TauriResult<String> {
    let (port, _) = stacks().get_config().await?;
    let rpc_url = format!("http://{}.local.ethui.dev:{}", slug, port);

    match utils::check_stack_online(&rpc_url).await {
        Ok(true) => Ok("online".to_string()),
        Ok(false) => Ok("offline".to_string()),
        Err(_) => Ok("offline".to_string()),
    }
}

#[command]
pub async fn stacks_remove(slug: String) -> TauriResult<()> {
    // Remove the stack
    stacks().remove_stack(slug.clone()).await?;

    stack_network_remove(slug).await;

    Ok(())
}

#[command]
pub async fn stacks_shutdown() -> TauriResult<()> {
    stacks().shutdown().await?;
    Ok(())
}

#[command]
pub async fn stacks_get_runtime_state() -> TauriResult<RuntimeStateResponse> {
    let runtime_state = stacks().get_runtime_state().await?;
    Ok(runtime_state)
}
