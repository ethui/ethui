use std::sync::Arc;

use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::router::tool::ToolRouter,
    model::{Implementation, ServerCapabilities, ServerInfo},
    tool, tool_handler, tool_router,
};
use serde_json::json;

use crate::{backend::Backend, error::Error};

/// The MCP server ethui exposes to an agent.
///
/// Generic over [`Backend`] so the same tools work over a WebSocket to a
/// running app today and, later, against an in-process handler.
pub struct EthuiMcp<B: Backend> {
    backend: Arc<B>,
    tool_router: ToolRouter<Self>,
}

// Written by hand rather than derived: `#[derive(Clone)]` would demand
// `B: Clone`, which `Arc<B>` makes unnecessary.
impl<B: Backend> Clone for EthuiMcp<B> {
    fn clone(&self) -> Self {
        Self {
            backend: self.backend.clone(),
            tool_router: self.tool_router.clone(),
        }
    }
}

/// Turn an internal failure into the string the agent shows a human.
fn tool_error(error: Error) -> McpError {
    McpError::internal_error(error.to_string(), None)
}

#[tool_router(router = tool_router)]
impl<B: Backend> EthuiMcp<B> {
    pub fn new(backend: Arc<B>) -> Self {
        Self {
            backend,
            tool_router: Self::tool_router(),
        }
    }

    #[tool(description = "Get the EVM chain id ethui is currently connected to.")]
    pub async fn get_chain(&self) -> std::result::Result<String, McpError> {
        let raw = self
            .backend
            .request("eth_chainId", json!([]))
            .await
            .map_err(tool_error)?;

        let hex = raw.as_str().ok_or_else(|| {
            McpError::internal_error(
                format!("ethui returned a non-string chain id: {raw}"),
                None,
            )
        })?;

        let chain_id = u64::from_str_radix(hex.trim_start_matches("0x"), 16)
            .map_err(|_| {
                McpError::internal_error(
                    format!("ethui returned an unparseable chain id: {hex}"),
                    None,
                )
            })?;

        Ok(chain_id.to_string())
    }
}

#[tool_handler(router = self.tool_router)]
impl<B: Backend> ServerHandler for EthuiMcp<B> {
    fn get_info(&self) -> ServerInfo {
        // `ServerInfo::new` fills `server_info` from rmcp's own build
        // environment, which would name this server "rmcp". Override it.
        let mut info = ServerInfo::new(ServerCapabilities::builder().enable_tools().build());
        info.server_info = Implementation::new("ethui-mcp", env!("CARGO_PKG_VERSION"));
        info
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::mock::{MockBackend, MockResponse};

    #[tokio::test]
    async fn get_chain_calls_eth_chain_id() {
        let backend = Arc::new(MockBackend::returning(json!("0x1")));
        let server = EthuiMcp::new(backend.clone());

        server.get_chain().await.unwrap();

        assert_eq!(backend.calls(), vec![("eth_chainId".to_owned(), json!([]))]);
    }

    #[tokio::test]
    async fn get_chain_renders_the_hex_quantity_as_decimal() {
        let backend = Arc::new(MockBackend::returning(json!("0x7a69")));
        let server = EthuiMcp::new(backend);

        assert_eq!(server.get_chain().await.unwrap(), "31337");
    }

    #[tokio::test]
    async fn get_chain_surfaces_a_backend_failure_as_a_sentence() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let server = EthuiMcp::new(backend);

        let err = server.get_chain().await.unwrap_err();

        assert_eq!(
            err.message,
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[tokio::test]
    async fn get_chain_rejects_a_non_hex_answer() {
        let backend = Arc::new(MockBackend::returning(json!("banana")));
        let server = EthuiMcp::new(backend);

        let err = server.get_chain().await.unwrap_err();

        assert!(
            err.message.contains("banana"),
            "error should quote what ethui actually returned, got: {}",
            err.message
        );
    }

    #[test]
    fn advertises_tools_and_identifies_itself_as_ethui_mcp() {
        let server = EthuiMcp::new(Arc::new(MockBackend::returning(json!("0x1"))));

        let info = server.get_info();

        assert_eq!(info.server_info.name, "ethui-mcp");
        assert!(info.capabilities.tools.is_some(), "tools capability must be advertised");
    }

    #[test]
    fn exposes_get_chain_in_the_tool_list() {
        let server = EthuiMcp::new(Arc::new(MockBackend::returning(json!("0x1"))));

        let names: Vec<_> = server
            .tool_router
            .list_all()
            .into_iter()
            .map(|tool| tool.name.to_string())
            .collect();

        assert_eq!(names, vec!["get_chain".to_owned()]);
    }
}
