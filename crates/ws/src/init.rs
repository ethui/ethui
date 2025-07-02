use ethui_args::Args;
use kameo::actor::ActorRef;

use crate::{actor::PeersActor, server::server_loop};

pub async fn init(args: &Args) {
    let port = args.ws_port;
    
    let actor = PeersActor::new();
    let handle = kameo::spawn(actor);
    handle.register("peers").unwrap();

    tokio::spawn(async move { server_loop(port).await });
}


