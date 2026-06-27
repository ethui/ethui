use alloy::{
    network::TransactionBuilder as _, providers::Provider as _, rpc::types::TransactionRequest,
};
use ethui_types::prelude::*;
use ethui_wallets::WalletControl;
use serde::Deserialize;

use crate::Result;

/// Raw call/transaction parameters from RPC
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CallParams {
    from: Option<Address>,
    to: Option<Address>,
    value: Option<U256>,
    data: Option<Bytes>,
    gas: Option<u64>,
}

impl CallParams {
    /// Convert to TransactionRequest, resolving `from` address from current wallet if not provided
    pub(crate) async fn into_request_with_from(self) -> Result<(Address, TransactionRequest)> {
        let mut request: TransactionRequest = self.into();

        let from = if let Some(addr) = request.from {
            addr
        } else {
            let wallet = ethui_wallets::get_current_wallet().await;
            let addr = wallet.get_current_address().await;
            request.set_from(addr);
            addr
        };

        Ok((from, request))
    }
}

impl From<CallParams> for TransactionRequest {
    fn from(params: CallParams) -> Self {
        let mut request = TransactionRequest::default();

        if let Some(from) = params.from {
            request.set_from(from);
        }
        if let Some(to) = params.to {
            request.set_to(to);
        }
        if let Some(value) = params.value {
            request.set_value(value);
        }
        if let Some(data) = params.data {
            request.set_input(data);
        }
        if let Some(gas) = params.gas {
            request.set_gas_limit(gas);
        }

        request
    }
}

/// Orchestrates eth_call
#[derive(Debug)]
pub(crate) struct SendCall {
    network: Network,
    request: TransactionRequest,
}

impl SendCall {
    pub(crate) fn new(network: Network, request: TransactionRequest) -> Self {
        Self { network, request }
    }

    pub(crate) async fn finish(&mut self) -> Result<Bytes> {
        self.send().await
    }

    async fn send(&mut self) -> Result<Bytes> {
        let provider = self.network.get_alloy_provider().await?;
        Ok(provider.call(self.request.clone()).await?)
    }
}
