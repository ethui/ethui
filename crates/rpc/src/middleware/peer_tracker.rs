use alloy::transports::BoxFuture;
use jsonrpc_core::futures_util::FutureExt as _;
use jsonrpsee::{
    server::middleware::rpc::RpcServiceT, types::Request, ConnectionId, MethodResponse,
};
use tower::Layer;

#[derive(Clone, Debug)]
pub struct PeerTrackerLayer {}

impl<S> Layer<S> for PeerTrackerLayer {
    type Service = PeerTracker<S>;
}

#[derive(Clone)]
pub struct PeerTracker<S> {}

impl<'a, S> RpcServiceT<'a> for PeerTracker<S>
where
    S: RpcServiceT<'a> + Send + Sync + Clone + 'static,
{
    type Future = BoxFuture<'a, MethodResponse>;

    fn call(&self, req: Request<'a>) -> Self::Future {
        dbg!(&req);
        dbg!(req.extensions().get::<ConnectionId>());
        //let count = self.count.clone();
        let service = self.service.clone();

        async move {
            let rp = service.call(req).await;
            rp
        }
        .boxed()
    }
}
