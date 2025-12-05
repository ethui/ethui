pub(crate) mod chain_add;
mod chain_update;
pub(crate) mod ethui;
pub(crate) mod send_call;
pub(crate) mod send_transaction;
pub(crate) mod sign_message;
pub(crate) mod token_add;

pub(crate) use chain_add::ChainAdd;
pub(crate) use chain_update::ChainUpdate;
use ethui_connections::Ctx;
use ethui_types::Json;
use jsonrpc_core::Params;
pub(crate) use send_call::SendCall;
pub(crate) use send_transaction::SendTransaction;
pub(crate) use sign_message::{EthSign, EthSignTypedData};
pub(crate) use token_add::TokenAdd;

use crate::Result;

/// Trait for RPC method handling
///
/// This trait combines construction from RPC params/context and execution
/// into a single interface for RPC method handlers.
pub(crate) trait Method: Sized {
    /// Attempt to construct Self from RPC params and context
    async fn build(params: Params, ctx: Ctx) -> Result<Self>;

    /// Execute the method and return the result
    async fn run(self) -> Result<Json>;
}
