use ethui_broadcast::{stack_network_add, stack_network_remove};
use ethui_types::{DedupChainId, NewNetworkParams, TauriResult};
use tauri::command;
use url::Url;

use crate::{
    actor::{CreateStack, GetConfig, GetRuntimeState, ListStracks, RemoveStack, Shutdown},
    utils,
};

#[command]
pub async fn stacks_create(slug: String) -> TauriResult<()> {
    crate::actor::ask(CreateStack(slug.clone())).await?;

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let (port, _) = crate::actor::ask(GetConfig()).await?;

    let rpc_url = format!("http://{}.local.ethui.dev:{}", slug, port);
    let chain_id = utils::get_chain_id(&rpc_url).await?;

    let explorer_url = format!("http://{}.local.ethui.dev:{}", slug, port);

    let network_params = NewNetworkParams {
        name: slug.clone(),
        chain_id,
        explorer_url: Some(explorer_url),
        http_url: Url::parse(&rpc_url).unwrap(),
        ws_url: Some(Url::parse(&rpc_url.replace("http", "ws")).unwrap()),
        currency: "ETH".to_string(),
        decimals: 18,
    };

    stack_network_add(network_params).await;

    Ok(())
}

#[command]
pub async fn stacks_list() -> TauriResult<Vec<String>> {
    let stacks = crate::actor::ask(ListStracks()).await?;
    Ok(stacks)
}

#[command]
pub async fn stacks_get_status(slug: String) -> TauriResult<String> {
    let (port, _) = crate::actor::ask(GetConfig()).await?;
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
    crate::actor::ask(RemoveStack(slug.clone())).await?;

    stack_network_remove(slug).await;

    Ok(())
}

#[command]
pub async fn stacks_shutdown() -> TauriResult<()> {
    crate::actor::ask(Shutdown()).await?;
    Ok(())
}

#[command]
pub async fn stacks_get_runtime_state() -> TauriResult<(bool, bool, String)> {
    let runtime_state = crate::actor::ask(GetRuntimeState()).await?;
    Ok(runtime_state)
}
