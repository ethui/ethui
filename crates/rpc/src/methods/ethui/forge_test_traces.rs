use ethui_connections::Ctx;
use ethui_types::Json;
use jsonrpc_core::Params as RpcParams;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;

use crate::{Result, methods::Method, params::extract_single_param};

#[derive(Debug)]
pub(crate) struct ForgeTestTraces {
    traces: Vec<ForgeTrace>,
}

impl Method for ForgeTestTraces {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;

        Ok(Self {
            traces: parsed.traces,
        })
    }

    async fn run(self) -> Result<Json> {
        info!("Processing {} forge test traces", self.traces.len());

        // TODO: Forward traces to UI or store for further processing

        Ok(json!({
            "status": "processed",
            "trace_count": self.traces.len()
        }))
    }
}

#[derive(Deserialize)]
struct Params {
    traces: Vec<ForgeTrace>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ForgeTrace {
    test_name: String,
    contract_name: String,
    trace_data: Json,
    gas_used: Option<u64>,
    success: bool,
}
