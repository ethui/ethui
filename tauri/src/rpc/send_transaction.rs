use std::str::FromStr;

use ethers::{
    prelude::*,
    signers::Wallet,
    types::{serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction},
};
use ethers_core::k256::ecdsa::SigningKey;

use super::{Error, Result};

#[derive(Default)]
pub struct SendTransaction {
    pub dialog: bool,
    pub request: TypedTransaction,
    pub signer: Option<SignerMiddleware<Provider<Http>, Wallet<SigningKey>>>,
}

impl SendTransaction {
    pub fn set_params(&mut self, params: serde_json::Value) -> &mut Self {
        // TODO: why is this an array?
        let params = &params.as_array().unwrap()[0];

        if let Some(from) = params["from"].as_str() {
            self.request.set_from(Address::from_str(from).unwrap());
        }

        if let Some(to) = params["to"].as_str() {
            self.request.set_to(Address::from_str(to).unwrap());
        }

        if let Some(value) = params["value"].as_str() {
            let v = StringifiedNumeric::String(value.to_string());
            self.request.set_value(U256::try_from(v).unwrap());
        }

        if let Some(data) = params["data"].as_str() {
            self.request.set_data(Bytes::from_str(data).unwrap());
        }

        self
    }

    pub fn set_chain_id(&mut self, chain_id: u32) -> &mut Self {
        self.request.set_chain_id(chain_id);
        self
    }

    pub fn set_signer(
        &mut self,
        signer: SignerMiddleware<Provider<Http>, Wallet<SigningKey>>,
    ) -> &mut Self {
        self.signer = Some(signer);
        self
    }

    pub async fn estimate_gas(&mut self) -> &mut Self {
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
        self
    }

    pub async fn spawn_dialog(&mut self) -> Result<()> {
        let params = serde_json::to_value(&self.request).unwrap();

        let rcv = crate::dialogs::open("tx-review", params).unwrap();

        match rcv.await {
            // 1st case is if the channel closes. 2nd case is if "Reject" is hit
            Err(_) | Ok(Err(_)) =>
            // TODO: what's the appropriate error to return here?
            // or should we return Ok(_)? Err(_) seems to close the ws connection
            {
                Err(Error::TxDialogRejected)
            }

            Ok(Ok(_response)) => Ok(()), // TODO: in the future, send json values here to override params
        }
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
