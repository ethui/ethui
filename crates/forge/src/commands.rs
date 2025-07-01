use color_eyre::eyre::ContextCompat as _;
use ethui_types::TauriResult;
use kameo::actor::ActorRef;

use crate::{
    abi::ForgeAbi,
    actor::{FetchAbis, Worker},
};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<ForgeAbi>> {
    async fn inner() -> color_eyre::Result<Vec<ForgeAbi>> {
        let actor =
            ActorRef::<Worker>::lookup("forge")?.with_context(|| "Actor not found".to_string())?;
        Ok(actor.ask(FetchAbis).await?)
    }

    Ok(inner().await?)
}
