use color_eyre::eyre::eyre;
use ethui_types::TauriResult;
use kameo::actor::ActorRef;

use crate::{
    abi::ForgeAbi,
    actor::{FetchAbis, Worker},
};

#[tauri::command]
pub async fn fetch_forge_abis() -> TauriResult<Vec<ForgeAbi>> {
    async fn inner() -> color_eyre::Result<Vec<ForgeAbi>> {
        let actor = ActorRef::<Worker>::lookup("forge")?.ok_or_else(|| eyre!("Actor not found"))?;
        Ok(actor.ask(FetchAbis).await?)
    }

    Ok(inner().await?)
}
