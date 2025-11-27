use std::path::PathBuf;

use color_eyre::eyre::Context as _;
use kameo::prelude::*;

use crate::actor::NetworksActor;

pub fn init(pathbuf: PathBuf) -> color_eyre::Result<()> {
    let actor = NetworksActor::spawn(pathbuf);
    actor
        .register("networks")
        .wrap_err_with(|| "Actor spawn error")?;
    Ok(())
}
