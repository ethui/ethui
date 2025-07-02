use std::path::PathBuf;

use kameo::actor::ActorRef;

use crate::actor::WalletsActor;

pub async fn init(pathbuf: PathBuf) {
    let actor = WalletsActor::new(pathbuf).await;
    let handle = kameo::spawn(actor);
    handle.register("wallets").unwrap();
}

