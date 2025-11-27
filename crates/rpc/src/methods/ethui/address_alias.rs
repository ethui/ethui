use ethui_settings::actor::*;
use ethui_types::prelude::*;

use crate::error::{Error, Result};

#[derive(Debug)]
pub struct AddressAlias {
    address: Address,
}

impl AddressAlias {
    pub fn build() -> Builder {
        Builder::default()
    }

    pub async fn run(self) -> Result<serde_json::Value> {
        let alias = settings()
            .ask(GetAlias(self.address))
            .await
            .map_err(|e| Error::Ethui(eyre!("Failed to get alias: {}", e)))?;

        Ok(json!(alias))
    }
}

#[derive(Default)]
pub struct Builder {
    params: Option<serde_json::Value>,
}

impl Builder {
    pub fn set_params(mut self, params: serde_json::Value) -> Self {
        self.params = Some(params);
        self
    }

    pub fn build(self) -> Result<AddressAlias> {
        let params = self.params.ok_or(Error::InvalidParams)?;
        let parsed_params: ParsedParams =
            serde_json::from_value(params).map_err(|_| Error::InvalidParams)?;

        Ok(AddressAlias {
            address: parsed_params.address,
        })
    }
}

#[derive(Deserialize)]
pub struct ParsedParams {
    address: Address,
}
