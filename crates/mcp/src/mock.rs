//! Test double for [`Backend`]. Test-only — never compiled into the binary.

use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use serde_json::Value;

use crate::{
    backend::Backend,
    error::{Error, Result},
};

/// What a [`MockBackend`] answers with, for every call it receives.
pub(crate) enum MockResponse {
    Ok(Value),
    Rpc { code: i64, message: String },
    Disconnected,
}

/// Records every `(method, params)` it is called with and replays a canned
/// response.
#[derive(Clone)]
pub(crate) struct MockBackend {
    calls: Arc<Mutex<Vec<(String, Value)>>>,
    response: Arc<MockResponse>,
}

impl MockBackend {
    /// A backend that answers every request with `value`.
    pub(crate) fn returning(value: Value) -> Self {
        Self::responding(MockResponse::Ok(value))
    }

    /// A backend that answers every request with a specific failure.
    pub(crate) fn responding(response: MockResponse) -> Self {
        Self {
            calls: Default::default(),
            response: Arc::new(response),
        }
    }

    /// Every call received so far, in order.
    pub(crate) fn calls(&self) -> Vec<(String, Value)> {
        self.calls.lock().unwrap().clone()
    }
}

#[async_trait]
impl Backend for MockBackend {
    async fn request(&self, method: &str, params: Value) -> Result<Value> {
        self.calls.lock().unwrap().push((method.to_owned(), params));

        match &*self.response {
            MockResponse::Ok(value) => Ok(value.clone()),
            MockResponse::Rpc { code, message } => Err(Error::Rpc {
                code: *code,
                message: message.clone(),
            }),
            MockResponse::Disconnected => Err(Error::Disconnected),
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[tokio::test]
    async fn records_calls_and_replays_the_canned_value() {
        let mock = MockBackend::returning(json!("0x1"));

        let result = mock.request("eth_chainId", json!([])).await.unwrap();

        assert_eq!(result, json!("0x1"));
        assert_eq!(mock.calls(), vec![("eth_chainId".to_owned(), json!([]))]);
    }

    #[tokio::test]
    async fn replays_a_canned_rpc_failure() {
        let mock = MockBackend::responding(MockResponse::Rpc {
            code: -32000,
            message: "nope".into(),
        });

        let err = mock.request("eth_chainId", json!([])).await.unwrap_err();

        assert_eq!(err.to_string(), "RPC error -32000: nope");
    }
}
