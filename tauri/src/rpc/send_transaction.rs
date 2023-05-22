use std::str::FromStr;

use ethers::{
    prelude::*,
    signers::Wallet,
    types::{serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction},
};
use ethers_core::k256::ecdsa::SigningKey;

use super::Result;

pub struct SendTransaction {
    pub request: TypedTransaction,
    pub signer: Option<SignerMiddleware<Provider<Http>, Wallet<SigningKey>>>,
}

impl SendTransaction {
    pub fn build(params: serde_json::Value) -> Self {
        // TODO: why is this an array?
        let params = &params.as_array().unwrap()[0];

        let mut request = TypedTransaction::default();

        request
            .set_from(Address::from_str(params[""].as_str().unwrap()).unwrap())
            .set_to(Address::from_str(params["to"].as_str().unwrap()).unwrap());

        if let Some(value) = params["value"].as_str() {
            let v = StringifiedNumeric::String(value.to_string());
            request.set_value(U256::try_from(v).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            request.set_data(Bytes::from_str(data).unwrap());
        }

        Self {
            request,
            signer: Default::default(),
        }
    }

    pub fn set_chain_id(&mut self, chain_id: u32) {
        self.request.set_chain_id(chain_id);
    }

    pub fn set_signer(&mut self, signer: SignerMiddleware<Provider<Http>, Wallet<SigningKey>>) {
        self.signer = Some(signer);
    }

    pub async fn estimate_gas(&mut self) {
        // TODO: we're defaulting to 1_000_000 gas cost if estimation fails
        // estimation failing means the tx will faill anyway, so this is fine'ish
        // but can probably be improved a lot in the future
        let gas_limit = self
            .signer
            .as_ref()
            .unwrap()
            .estimate_gas(&self.request, None)
            .await
            .unwrap_or(1_000_000.into());

        self.request.set_gas(gas_limit * 120 / 100);
    }

    pub async fn send(&mut self) -> Result<PendingTransaction<'_, Http>> {
        Ok(self
            .signer
            .as_ref()
            .unwrap()
            .send_transaction(self.request.clone(), None)
            .await?)
    }
}
