//! Traits for RPC method handling

use ethui_connections::Ctx;
use ethui_types::Json;
use jsonrpc_core::Params;

use crate::Result;

/// Trait for RPC method handling
///
/// This trait combines construction from RPC params/context and execution
/// into a single interface for RPC method handlers.
pub(crate) trait Method: Sized {
    /// Attempt to construct Self from RPC params and context
    fn build(
        params: Params,
        ctx: Ctx,
    ) -> impl std::future::Future<Output = Result<Self>> + Send;

    /// Execute the method and return the result
    fn run(self) -> impl std::future::Future<Output = Result<Json>> + Send;
}
