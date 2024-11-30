use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use std::task::{Context, Poll};

use futures::future::BoxFuture;
use jsonrpc_core::futures_util::FutureExt as _;
use jsonrpsee::{server::middleware::rpc::RpcServiceT, types::Request, MethodResponse};

use jsonrpsee::server::HttpRequest;
use tower::{Layer, Service};

#[derive(Clone, Debug)]
pub struct PeerTrackerLayer {
    counter: Arc<AtomicU64>,
}

impl PeerTrackerLayer {
    pub fn new() -> Self {
        Self {
            counter: Default::default(),
        }
    }
}

impl<S> Layer<S> for PeerTrackerLayer {
    type Service = PeerTracker<S>;

    fn layer(&self, inner: S) -> Self::Service {
        dbg!("new http layer");
        PeerTracker {
            inner,
            counter: self.counter.clone(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct PeerTracker<S> {
    inner: S,
    counter: Arc<AtomicU64>,
}

#[derive(Clone, Debug)]
pub struct PeerID(u64);

impl<S, B> Service<HttpRequest<B>> for PeerTracker<S>
where
    S: Service<HttpRequest<B>>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    #[inline]
    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx).map_err(Into::into)
    }

    fn call(&mut self, mut request: HttpRequest<B>) -> Self::Future {
        let id = Some(PeerID(self.counter.fetch_add(1, Ordering::SeqCst)));
        request.extensions_ut().insert(id);
        self.inner.call(request)
    }
}

// It's possible to access the connection ID
// by using the low-level API.
#[derive(Clone)]
pub struct CallsPerConn<S> {
    service: S,
}

impl<S> CallsPerConn<S> {
    pub fn new(service: S) -> Self {
        Self { service }
    }
}

impl<'a, S> RpcServiceT<'a> for CallsPerConn<S>
where
    S: RpcServiceT<'a> + Send + Sync + Clone + 'static,
{
    type Future = BoxFuture<'a, MethodResponse>;

    fn call(&self, req: Request<'a>) -> Self::Future {
        let id = req.extensions().get::<Option<PeerID>>();

        dbg!(id);
        let service = self.service.clone();

        async move { service.call(req).await }.boxed()
    }
}
