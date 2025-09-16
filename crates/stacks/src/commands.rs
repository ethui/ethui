use ethui_broadcast::{stack_network_add, stack_network_remove};
use ethui_types::{DedupChainId, NewNetworkParams, TauriResult};
use tauri::command;
use url::Url;

use crate::{
    actor::{CreateStack, ListStracks, RemoveStack, Shutdown},
    utils,
};

#[command]
pub async fn stacks_create(slug: String) -> TauriResult<()> {
    crate::actor::ask(CreateStack(slug.clone())).await?;

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let rpc_url = format!("http://{}.local.ethui.dev:9110", slug);
    let chain_id = utils::get_chain_id(&rpc_url).await?;

    let explorer_url = format!("http://{}.local.ethui.dev:9110", slug);

    let network_params = NewNetworkParams {
        name: slug.clone(),
        dedup_chain_id: DedupChainId::from((chain_id, 0)),
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
    let rpc_url = format!("http://{}.local.ethui.dev:9110", slug);
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
