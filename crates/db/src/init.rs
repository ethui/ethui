use std::path::PathBuf;

use kameo::actor::ActorRef;

use crate::{actor::{DbActor, Msg}, Db};

pub async fn init(path: &PathBuf) -> color_eyre::Result<Db> {
    let actor = DbActor::new(path).await?;
    let db = actor.db().clone();
    let handle = kameo::spawn(actor);
    handle.register("db").unwrap();
    Ok(db)
}

pub fn get() -> Db {
    let handle: ActorRef<DbActor> = futures::executor::block_on(kameo::registry::get("db")).unwrap();
    futures::executor::block_on(handle.ask(Msg::Get)).unwrap()
}

