use jsonrpsee::server::{RpcServiceBuilder, Server};
use tokio::task::JoinHandle;
use tracing::instrument;

use crate::middleware::{CallsPerConn, PeerTrackerLayer};

#[derive(Default)]
pub struct RpcServer {
    handle: Option<JoinHandle<()>>,
}

impl RpcServer {
    #[instrument(skip(self))]
    pub async fn start(&mut self, port: u16) {
        let addr = format!("127.0.0.1:{}", port);
        tracing::debug!("RPC server listening on: {}", addr);

        let service_builder = tower::ServiceBuilder::new().layer(PeerTrackerLayer::new());
        let rpc_middleware =
            RpcServiceBuilder::new().layer_fn(|service| CallsPerConn::new(service));

        let server = Server::builder()
            .set_http_middleware(service_builder)
            .set_rpc_middleware(rpc_middleware)
            .build(addr)
            .await
            .unwrap();
        let rpc = crate::apis::module();
        let handle = server.start(rpc);

        self.handle = Some(tokio::spawn(handle.stopped()));
    }
}
