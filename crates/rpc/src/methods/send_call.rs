use std::str::FromStr;

use ethers::{
    prelude::*,
    types::{serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction},
};
use ethui_connections::Ctx;
use ethui_networks::Network;
use ethui_types::{Address, ToEthers};

use crate::Result;

/// Orchestrates the signing of a transaction
/// Takes references to both the wallet and network where this
#[derive(Debug)]
pub struct SendCall {
    pub network: Network,
    pub request: TypedTransaction,
}

impl<'a> SendCall {
    pub fn build(ctx: &Ctx) -> SendCallBuilder<'_> {
        SendCallBuilder::new(ctx)
    }

    pub async fn finish(&mut self) -> Result<Bytes> {
        self.send().await
    }

    async fn send(&mut self) -> Result<Bytes> {
        let provider = self.network.get_provider();
        Ok(provider.call(&self.request, None).await?)
    }
}

pub struct SendCallBuilder<'a> {
    ctx: &'a Ctx,
    pub request: TypedTransaction,
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
            &params.as_array().unwrap()[0]
        } else {
            &params
        };

        if let Some(from) = params["from"].as_str() {
            self.request
                .set_from(Address::from_str(from).unwrap().to_ethers());
        }
        if let Some(to) = params["to"].as_str() {
            self.request
                .set_to(Address::from_str(to).unwrap().to_ethers());
        }

        if let Some(value) = params["value"].as_str() {
            let v = StringifiedNumeric::String(value.to_string());
            self.request.set_value(U256::try_from(v).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            self.request.set_data(Bytes::from_str(data).unwrap());
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
