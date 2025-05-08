use kameo::actor::ActorRef;

use crate::{
    abi::ForgeAbi,
    actor::{FetchAbis, Worker},
    error::{Error, Result},
};

#[tauri::command]
pub async fn fetch_forge_abis() -> Result<Vec<ForgeAbi>> {
    let actor = ActorRef::<Worker>::lookup("forge_actor")?.ok_or(Error::ActorNotFound)?;

    Ok(actor.ask(FetchAbis).await?)
}
