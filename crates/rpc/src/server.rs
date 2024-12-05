use jsonrpsee::server::{Methods, RpcServiceBuilder, Server, StopHandle, TowerServiceBuilder};
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

#[derive(Clone)]
pub struct PerConnection<RpcMiddleware, HttpMiddleware> {
    methods: Methods,
    stop_handle: StopHandle,
    //metrics: Metrics,
    svc_builder: TowerServiceBuilder<RpcMiddleware, HttpMiddleware>,
}

pub fn per_connection<RpcMiddleware, HttpMiddleware>(
    methods: Methods,
    svc_builder: TowerServiceBuilder<RpcMiddleware, HttpMiddleware>,
    stop_handle: StopHandle,
) -> PerConnection<RpcMiddleware, HttpMiddleware> {
    PerConnection {
        methods,
        stop_handle,
        //metrics: Metrics::default(),
        svc_builder,
    }
}
