use std::process::{Child, Command, Stdio};

use ethui_types::{Network, NetworkStatus, prelude::*};
use tokio::time::{Duration, sleep};
use tracing::debug;
use url::Url;

use crate::tracker2::{consumer::Consumer, worker::Msg};

pub struct AnvilInstance {
    process: Child,
    port: u16,
}

impl AnvilInstance {
    pub async fn start() -> Result<Self> {
        // Use fixed port since tests run serially
        let port = 18545;

        let mut process = Command::new("anvil")
            .arg("--port")
            .arg(port.to_string())
            .arg("--silent")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;

        // Give Anvil time to start
        sleep(Duration::from_millis(500)).await;

        // Check if process is still running
        match process.try_wait() {
            Ok(Some(status)) => {
                return Err(eyre!("Anvil process exited early with status: {}", status));
            }
            Ok(None) => {} // Still running
            Err(e) => {
                return Err(eyre!("Failed to check Anvil process status: {}", e));
            }
        }

        Ok(Self { process, port })
    }

    pub fn create_network(&self, name: &str) -> Network {
        Network {
            dedup_chain_id: (31337, 0).into(),
            name: name.to_string(),
            explorer_url: None,
            http_url: Url::parse(&format!("http://localhost:{}", self.port)).unwrap(),
            ws_url: Some(Url::parse(&format!("ws://localhost:{}", self.port)).unwrap()),
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        }
    }
}

impl Drop for AnvilInstance {
    fn drop(&mut self) {
        let _ = self.process.kill();
        let _ = self.process.wait();
    }
}

#[derive(Clone)]
pub struct TestConsumer;

impl Consumer for TestConsumer {
    async fn process(&mut self, msg: Msg) {
        debug!("TestConsumer processing message: {:?}", msg);
    }
}
