use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use alloy::transports::BoxFuture;
use jsonrpc_core::futures_util::FutureExt as _;
use jsonrpsee::{server::middleware::rpc::RpcServiceT, types::Request, MethodResponse};

#[derive(Clone)]
pub struct CallsPerConn<S> {
    pub service: S,
    pub count: Arc<AtomicUsize>,
}

impl<'a, S> RpcServiceT<'a> for CallsPerConn<S>
where
    S: RpcServiceT<'a> + Send + Sync + Clone + 'static,
{
    type Future = BoxFuture<'a, MethodResponse>;

    fn call(&self, req: Request<'a>) -> Self::Future {
        let count = self.count.clone();
        let service = self.service.clone();

        async move {
            let rp = service.call(req).await;
            count.fetch_add(1, Ordering::SeqCst);
            let count = count.load(Ordering::SeqCst);
            println!("the server has processed calls={count} on the connection");
            rp
        }
        .boxed()
    }
}
