//! Test double for [`Backend`]. Test-only — never compiled into the binary.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use async_trait::async_trait;
use serde_json::Value;

use crate::{
    backend::Backend,
    error::{Error, Result},
};

/// What a [`MockBackend`] answers with, for every call it receives.
pub(crate) enum MockResponse {
    Ok(Value),
    /// One canned answer per method, for tools that make more than one call.
    /// An unrouted method answers "method not found", as ethui would.
    ByMethod(HashMap<String, Value>),
    Rpc {
        code: i64,
        message: String,
    },
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

    /// A backend that answers each listed method with its own value.
    pub(crate) fn routing<const N: usize>(routes: [(&str, Value); N]) -> Self {
        Self::responding(MockResponse::ByMethod(
            routes
                .into_iter()
                .map(|(method, value)| (method.to_owned(), value))
                .collect(),
        ))
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
            MockResponse::ByMethod(routes) => {
                routes.get(method).cloned().ok_or_else(|| Error::Rpc {
                    code: -32601,
                    message: format!("the method {method} does not exist/is not available"),
                })
            }
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
    async fn routes_each_method_to_its_own_answer() {
        let mock = MockBackend::routing([
            ("eth_accounts", json!(["0xabc"])),
            ("eth_chainId", json!("0x1")),
        ]);

        assert_eq!(
            mock.request("eth_accounts", json!([])).await.unwrap(),
            json!(["0xabc"])
        );
        assert_eq!(
            mock.request("eth_chainId", json!([])).await.unwrap(),
            json!("0x1")
        );
    }

    #[tokio::test]
    async fn an_unrouted_method_answers_method_not_found() {
        let mock = MockBackend::routing([("eth_chainId", json!("0x1"))]);

        let err = mock.request("eth_accounts", json!([])).await.unwrap_err();

        assert!(err.to_string().contains("-32601"), "got: {err}");
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
