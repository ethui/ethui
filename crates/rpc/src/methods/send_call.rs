use std::str::FromStr;

use alloy::{
    network::TransactionBuilder as _,
    primitives::{Address, Bytes, U256},
    providers::Provider as _,
    rpc::types::TransactionRequest,
};
use ethui_connections::Ctx;
use ethui_networks::Network;

use crate::Result;

/// Orchestrates the signing of a transaction
/// Takes references to both the wallet and network where this
#[derive(Debug)]
pub struct SendCall {
    pub network: Network,
    pub request: TransactionRequest,
}

impl<'a> SendCall {
    pub fn build(ctx: &Ctx) -> SendCallBuilder<'_> {
        SendCallBuilder::new(ctx)
    }

    pub async fn finish(&mut self) -> Result<Bytes> {
        self.send().await
    }

    async fn send(&mut self) -> Result<Bytes> {
        let provider = self.network.get_alloy_provider().await?;
        Ok(provider.call(&self.request).await?)
    }
}

pub struct SendCallBuilder<'a> {
    ctx: &'a Ctx,
    pub request: TransactionRequest,
}

impl<'a> SendCallBuilder<'a> {
    pub fn new(ctx: &'a Ctx) -> Self {
        Self {
            ctx,
            request: Default::default(),
        }
    }

    pub async fn set_request(mut self, params: serde_json::Value) -> Result<SendCallBuilder<'a>> {
        // TODO: why is this an array?
        let params = if params.is_array() {
            params.as_array().unwrap()[0].clone()
        } else {
            params
        };

        if let Some(from) = params["from"].as_str() {
            self.request.set_from(Address::from_str(from).unwrap());
        }
        if let Some(to) = params["to"].as_str() {
            self.request.set_to(Address::from_str(to).unwrap());
        }

        if let Some(value) = params["value"].as_str() {
            self.request.set_value(U256::from_str(value).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            self.request.set_input(Bytes::from_str(data).unwrap());
        }

        Ok(self)
    }

    pub async fn build(self) -> SendCall {
        SendCall {
            network: self.ctx.network().await,
            request: self.request,
        }
    }
}
