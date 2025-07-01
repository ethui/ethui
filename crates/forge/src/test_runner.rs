use std::process::Command;

use color_eyre::{eyre, Result};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct ForgeTrace {
    pub test_name: String,
    pub contract_name: String,
    pub trace_data: serde_json::Value,
    pub gas_used: Option<u64>,
    pub success: bool,
}

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

    pub async fn run_tests(&self) -> Result<()> {
        tracing::info!("Running forge tests in {}", self.project_path);

        // Run forge test with JSON output
        let output = Command::new("forge")
            .args(["test", "--json", "-vvvv"])
            .current_dir(&self.project_path)
            .output()
            .map_err(|e| eyre::eyre!("Failed to execute forge test: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(eyre::eyre!("Forge test failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);

        let traces = self.parse_forge_output(&stdout)?;

        if traces.is_empty() {
            tracing::info!("No traces to send");
            return Ok(());
        }

        self.send_traces_to_rpc(traces).await
    }

    fn parse_forge_output(&self, output: &str) -> Result<Vec<ForgeTrace>> {
        let mut traces = Vec::new();

        let json_value: serde_json::Value = serde_json::from_str(output)
            .map_err(|e| eyre::eyre!("Failed to parse forge JSON output: {e}"))?;

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

    async fn send_traces_to_rpc(&self, traces: Vec<ForgeTrace>) -> Result<()> {
        let ws_url = format!("ws://127.0.0.1:{}", self.ws_port);
        tracing::info!("Connecting to WebSocket server at {ws_url}");

        let (ws_stream, _) = connect_async(&ws_url)
            .await
            .map_err(|e| eyre::eyre!("WebSocket connection failed: {e}"))?;

        let (mut ws_sender, _) = ws_stream.split();

        let rpc_request = json!({
            "jsonrpc": "2.0",
            "method": "ethui_forge_test_runner_output",
            "params": {
                "traces": traces
            },
            "id": 1
        });

        let request_str = serde_json::to_string(&rpc_request)
            .map_err(|e| eyre::eyre!("Failed to serialize RPC request: {e}"))?;

        tracing::info!("Sending traces to {ws_url}");
        ws_sender
            .send(Message::Text(request_str))
            .await
            .map_err(|e| {
                error!("Failed to send WebSocket message: {}", e);
                eyre::eyre!("WebSocket send failed: {e}")
            })?;

        let _ = ws_sender.close().await;

        Ok(())
    }
}
