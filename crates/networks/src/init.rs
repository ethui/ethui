use std::path::PathBuf;

use kameo::actor::ActorRef;

use crate::actor::NetworksActor;

pub async fn init(pathbuf: PathBuf) {
    let actor = NetworksActor::new(pathbuf).await;
    let handle = kameo::spawn(actor);
    handle.register("networks").unwrap();
}


