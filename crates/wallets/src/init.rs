use std::path::PathBuf;

use kameo::actor::Spawn as _;

use crate::actor::WalletsActor;

pub async fn init(pathbuf: PathBuf) {
    let actor = WalletsActor::spawn(pathbuf);

    actor
        .register("wallets")
        .expect("Failed to register wallets actor");
}
