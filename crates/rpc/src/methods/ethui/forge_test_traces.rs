use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;

use crate::error::{Error, Result};

#[derive(Debug)]
pub struct ForgeTestTraces {
    traces: Vec<ForgeTrace>,
}

impl ForgeTestTraces {
    pub fn build() -> Builder {
        Builder::default()
    }

    pub async fn run(self) -> Result<serde_json::Value> {
        info!("Processing {} forge test traces", self.traces.len());

        // TODO: Forward traces to UI or store for further processing

        Ok(json!({
            "status": "processed",
            "trace_count": self.traces.len()
        }))
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

    pub fn build(self) -> Result<ForgeTestTraces> {
        let params = self.params.ok_or(Error::InvalidParams)?;
        let parsed_params: ParsedParams =
            serde_json::from_value(params).map_err(|_| Error::InvalidParams)?;

        Ok(ForgeTestTraces {
            traces: parsed_params.traces,
        })
    }
}

#[derive(Deserialize)]
pub struct ParsedParams {
    traces: Vec<ForgeTrace>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForgeTrace {
    pub test_name: String,
    pub contract_name: String,
    pub trace_data: serde_json::Value,
    pub gas_used: Option<u64>,
    pub success: bool,
}
