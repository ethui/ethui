use std::path::PathBuf;

use kameo::actor::ActorRef;

use crate::actor::{SettingsActor, Msg, Reply};

pub async fn init(pathbuf: PathBuf) -> color_eyre::Result<()> {
    let actor = SettingsActor::new(pathbuf).await?;
    let handle = kameo::spawn(actor);
    handle.register("settings").unwrap();
    Ok(())
}


