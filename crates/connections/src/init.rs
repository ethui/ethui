use std::path::PathBuf;

use kameo::actor::ActorRef;

use crate::actor::StoreActor;

pub async fn init(pathbuf: PathBuf) {
    let actor = StoreActor::new(pathbuf).await;
    let handle = kameo::spawn(actor);
    handle.register("connections_store").unwrap();
}


