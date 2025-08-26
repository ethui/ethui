use std::path::PathBuf;

use color_eyre::eyre::{OptionExt, WrapErr, eyre};
use ethui_types::TauriResult;
use kameo::{Actor, Reply, actor::ActorRef, message::Message, prelude::Context};
use tauri::command;

use crate::{
    actor::{GetConfig, SetEnabled, Worker},
    docker::start_stacks,
};

#[command]
pub async fn stacks_create(slug: String) -> TauriResult<()> {
    let actor = ActorRef::<Worker>::lookup("run_local_stacks")
        .wrap_err_with(|| "run local stacks actor not found")?
        .ok_or_eyre("actor not found")?;
    actor.ask(SetEnabled());
    Ok(())
}

#[command]
pub async fn stacks_list() -> TauriResult<Vec<String>> {
    let actor = ActorRef::<Worker>::lookup("run_local_stacks")
        .wrap_err_with(|| "run local stacks actor not found")?
        .ok_or_eyre("actor not found")?;
    let msg = actor.ask(GetConfig()).await?;
    let (port, config_dir) = msg;
    let manager = start_stacks(port, config_dir.clone())?;
    let stacks = manager.list_stacks().await?;
    Ok(stacks)
}
