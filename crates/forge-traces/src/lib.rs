use std::process::Command;

use ethui_args::Forge;
use ethui_types::prelude::*;
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

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        // Log the status but continue processing traces regardless of test success/failure
        if !output.status.success() {
            tracing::warn!(
                "Forge tests failed (exit code: {:?}), but continuing to process traces. stderr: {}",
                output.status.code(),
                stderr
            );
        } else {
            tracing::info!("Forge tests completed successfully");
        }

        let traces = match self.parse_forge_output(&stdout) {
            Ok(traces) => traces,
            Err(e) => {
                tracing::error!("Failed to parse forge output: {e}");
                tracing::debug!("Raw forge stdout: {}", stdout);
                tracing::debug!("Raw forge stderr: {}", stderr);

                // Return empty traces instead of failing completely
                Vec::new()
            }
        };

        if traces.is_empty() {
            tracing::info!("No traces to send (either no tests ran or parsing failed)");
            return Ok(());
        }

        self.send_traces_to_rpc(traces).await
    }

    fn parse_forge_output(&self, output: &str) -> Result<Vec<ForgeTrace>> {
        let mut traces = Vec::new();

        // Handle empty or non-JSON output
        if output.trim().is_empty() {
            tracing::warn!("Forge output is empty");
            return Ok(traces);
        }

        let json_value: serde_json::Value = serde_json::from_str(output).map_err(|e| {
            tracing::error!("Raw forge output that failed to parse: {}", output);
            eyre!("Failed to parse forge JSON output: {e}")
        })?;

        // Log the top-level structure to help debug different output formats
        tracing::debug!(
            "Forge JSON output keys: {:?}",
            json_value
                .as_object()
                .map(|obj| obj.keys().collect::<Vec<_>>())
        );

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
                            .map(|s| match s {
                                "Success" => true,
                                "Failure" | "Revert" | "Panic" | "OutOfGas" | "Setup" => false,
                                _ => {
                                    tracing::warn!(
                                        "Unknown test status: {}, treating as failure",
                                        s
                                    );
                                    false
                                }
                            })
                            .unwrap_or_else(|| {
                                tracing::warn!(
                                    "Missing test status for {}, treating as failure",
                                    test_name
                                );
                                false
                            });

                        let gas_used = test_result.get("kind").and_then(|kind| {
                            if let Some(unit) = kind.get("Unit") {
                                unit.get("gas").and_then(|v| v.as_u64())
                            } else if let Some(fuzz) = kind.get("Fuzz") {
                                fuzz.get("median_gas").and_then(|v| v.as_u64())
                            } else {
                                None
                            }
                        });

                        // Try to get traces from multiple possible locations
                        let trace_data = test_result
                            .get("traces")
                            .cloned()
                            .or_else(|| {
                                // For failed tests, traces might be under different keys
                                test_result
                                    .get("execution")
                                    .and_then(|exec| exec.get("traces"))
                                    .cloned()
                            })
                            .or_else(|| {
                                // Check if traces are nested under the test kind
                                test_result
                                    .get("kind")
                                    .and_then(|kind| {
                                        kind.get("Unit")
                                            .or_else(|| kind.get("Fuzz"))
                                            .and_then(|unit| unit.get("traces"))
                                    })
                                    .cloned()
                            })
                            .unwrap_or_else(|| json!([]));

                        let has_traces = !trace_data.as_array().is_none_or(|arr| arr.is_empty());

                        tracing::debug!(
                            "Processing test: {} in contract: {}, success: {}, has_traces: {}",
                            test_name,
                            contract_name,
                            success,
                            has_traces
                        );

                        // If we're not finding traces for a failed test, log the full test result structure
                        if !success && !has_traces {
                            tracing::debug!(
                                "Failed test {} has no traces. Full test result: {}",
                                test_name,
                                serde_json::to_string_pretty(test_result).unwrap_or_default()
                            );
                        }

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

        let successful_tests = traces.iter().filter(|t| t.success).count();
        let failed_tests = traces.iter().filter(|t| !t.success).count();

        info!(
            "Parsed {} traces from forge output ({} successful, {} failed)",
            traces.len(),
            successful_tests,
            failed_tests
        );
        Ok(traces)
    }

    #[instrument(skip_all)]
    async fn send_traces_to_rpc(&self, traces: Vec<ForgeTrace>) -> Result<()> {
        let ws_url = format!("ws://127.0.0.1:{}", self.ws_port);

        let (ws_stream, _) = connect_async(&ws_url).await?;

        let (mut ws_sender, _) = ws_stream.split();

        let rpc_request = json!({
            "jsonrpc": "2.0",
            "method": "ethui_forgeTestSubmitRun",
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

pub async fn handle_forge_command(subcommand: &Forge, args: &ethui_args::Args) -> Result<()> {
    use std::env;

    match subcommand {
        Forge::Test(ethui_args::ForgeTest { args: test_args }) => {
            let current_dir = env::current_dir().expect("failed to get current dir");
            let forge_test_runner =
                ForgeTestRunner::new(current_dir.to_string_lossy().to_string(), args.ws_port);
            forge_test_runner.run_tests(test_args).await
        }
    }
}
