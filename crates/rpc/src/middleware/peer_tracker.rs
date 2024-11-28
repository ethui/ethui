use std::task::{Context, Poll};

use jsonrpsee::server::HttpRequest;
use tower::{Layer, Service};

#[derive(Clone, Debug)]
pub struct PeerTrackerLayer {}

impl<S> Layer<S> for PeerTrackerLayer {
    type Service = PeerTracker<S>;

    fn layer(&self, inner: S) -> Self::Service {
        dbg!("layer");
        PeerTracker { inner }
    }
}

#[derive(Clone, Debug)]
pub struct PeerTracker<S> {
    inner: S,
}

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
        let uri = request.uri().clone();
        request.extensions_mut().insert(uri);
        dbg!("inserting");
        self.inner.call(request)
    }
}
