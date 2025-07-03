use std::path::PathBuf;

use kameo::spawn;

use super::actor::WalletsActor;

pub async fn init(pathbuf: PathBuf) -> color_eyre::Result<()> {
    let actor = spawn(WalletsActor::new(pathbuf).await?);
    actor.register("wallets")?;
    Ok(())
}
