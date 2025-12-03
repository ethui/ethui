use std::process::Command;

use args::Forge;
use common::prelude::*;
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[derive(Debug, Serialize, Deserialize)]
pub struct ForgeTrace {
    pub test_name: String,
    pub contract_name: String,
    pub trace_data: serde_json::Value,
    pub gas_used: Option<u64>,
    pub success: bool,
}

#[derive(Debug)]
pub struct ForgeTestRunner {
    project_path: String,
    ws_port: u16,
}

impl ForgeTestRunner {
    pub fn new(project_path: String, ws_port: u16) -> Self {
        Self {
            project_path,
            ws_port,
        }
    }

    #[instrument(skip_all, fields(project_path = self.project_path))]
    pub async fn run_tests(&self, extra_args: &[String]) -> Result<()> {
        let mut cmd = Command::new("forge");
        cmd.args(["test", "--json", "-vvvvv"]);
        cmd.args(extra_args);
        cmd.current_dir(&self.project_path);

        let output = cmd.output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(eyre!("Forge test failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);

        let traces = self.parse_forge_output(&stdout)?;

        if traces.is_empty() {
            return Ok(());
        }

        self.send_traces_to_rpc(traces).await
    }

    fn parse_forge_output(&self, output: &str) -> Result<Vec<ForgeTrace>> {
        let mut traces = Vec::new();

        let json_value: serde_json::Value = serde_json::from_str(output)?;

        if let Some(test_contracts) = json_value.as_object() {
            for (contract_path, contract_results) in test_contracts {
                // Extract contract name from path (e.g., "test/Counter.t.sol:CounterTest" -> "CounterTest")
                let contract_name = contract_path
                    .split(':')
                    .next_back()
                    .unwrap_or(contract_path)
                    .to_string();

                if let Some(test_results) = contract_results
                    .get("test_results")
                    .and_then(|v| v.as_object())
                {
                    for (test_name, test_result) in test_results {
                        let success = test_result
                            .get("status")
                            .and_then(|v| v.as_str())
                            .map(|s| s == "Success")
                            .unwrap_or(false);

                        let gas_used = test_result.get("kind").and_then(|kind| {
                            if let Some(unit) = kind.get("Unit") {
                                unit.get("gas").and_then(|v| v.as_u64())
                            } else if let Some(fuzz) = kind.get("Fuzz") {
                                fuzz.get("median_gas").and_then(|v| v.as_u64())
                            } else {
                                None
                            }
                        });

                        let trace_data = test_result
                            .get("traces")
                            .cloned()
                            .unwrap_or_else(|| json!([]));

                        traces.push(ForgeTrace {
                            test_name: test_name.clone(),
                            contract_name: contract_name.clone(),
                            trace_data,
                            gas_used,
                            success,
                        });
                    }
                }
            }
        }

        info!("Parsed {} traces from forge output", traces.len());
        Ok(traces)
    }

    #[instrument(skip_all)]
    async fn send_traces_to_rpc(&self, traces: Vec<ForgeTrace>) -> Result<()> {
        let ws_url = format!("ws://127.0.0.1:{}", self.ws_port);

        let (ws_stream, _) = connect_async(&ws_url).await?;

        let (mut ws_sender, _) = ws_stream.split();

        let rpc_request = json!({
            "jsonrpc": "2.0",
            "method": "forgeTestSubmitRun",
            "params": {
                "traces": traces
            },
            "id": 1
        });

        let request_str = serde_json::to_string(&rpc_request)?;

        ws_sender.send(Message::Text(request_str.into())).await?;

        let _ = ws_sender.close().await;

        Ok(())
    }
}

pub async fn handle_forge_command(subcommand: &Forge, args: &args::Args) -> Result<()> {
    use std::env;

    match subcommand {
        Forge::Test(args::ForgeTest { args: test_args }) => {
            let current_dir = env::current_dir().expect("failed to get current dir");
            let forge_test_runner =
                ForgeTestRunner::new(current_dir.to_string_lossy().to_string(), args.ws_port);
            forge_test_runner.run_tests(test_args).await
        }
    }
}
