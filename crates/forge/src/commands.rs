use color_eyre::eyre::ContextCompat as _;
use ethui_types::{prelude::*, TauriResult};
use kameo::actor::ActorRef;

use crate::{
    abi::ForgeAbi,
    actor::{FetchAbis, GetAbiFor, Worker},
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

#[tauri::command]
pub async fn get_abi_for_code(bytecode: String) -> TauriResult<Option<ForgeAbi>> {
    async fn inner(bytecode: String) -> color_eyre::Result<Option<ForgeAbi>> {
        let actor =
            ActorRef::<Worker>::lookup("forge")?.with_context(|| "Actor not found".to_string())?;

        // Convert hex string to bytes using Bytes::from_str
        let bytes = Bytes::from_str(&bytecode)?;

        Ok(actor.ask(GetAbiFor(bytes)).await?)
    }

    Ok(inner(bytecode).await?)
}
