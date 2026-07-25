use std::sync::Arc;

use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::{Implementation, ServerCapabilities, ServerInfo},
    schemars::JsonSchema,
    tool, tool_handler, tool_router,
};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::{
    backend::Backend,
    catalog::{self, Kind},
    error::Error,
    format,
    registry::{MethodRegistry, Snapshot},
};

/// A tool result is a string the agent reads, or a sentence explaining why not.
type ToolResult = std::result::Result<String, McpError>;

/// The MCP server ethui exposes to an agent.
///
/// Generic over [`Backend`] so the same tools work over a WebSocket to a
/// running app today and, later, against an in-process handler.
pub struct EthuiMcp<B: Backend> {
    backend: Arc<B>,
    registry: Arc<MethodRegistry<B>>,
    tool_router: ToolRouter<Self>,
}

// Written by hand rather than derived: `#[derive(Clone)]` would demand
// `B: Clone`, which `Arc<B>` makes unnecessary.
impl<B: Backend> Clone for EthuiMcp<B> {
    fn clone(&self) -> Self {
        Self {
            backend: self.backend.clone(),
            registry: self.registry.clone(),
            tool_router: self.tool_router.clone(),
        }
    }
}

/// Turn an internal failure into the string the agent shows a human.
fn tool_error(error: Error) -> McpError {
    McpError::internal_error(error.to_string(), None)
}

/// Served method names close enough to `target` to be worth suggesting.
///
/// Substring matching in both directions catches the two mistakes agents
/// actually make: dropping the namespace (`getBalance`) and over-qualifying it.
fn near_matches(target: &str, snapshot: &Snapshot) -> Vec<String> {
    let target = target.to_lowercase();

    snapshot
        .entries
        .iter()
        .map(|entry| &entry.name)
        .filter(|name| {
            let name = name.to_lowercase();
            name.contains(&target) || target.contains(&name)
        })
        .take(5)
        .cloned()
        .collect()
}

/// Add the catalog's advice to a failure from a method it documents as a stub.
///
/// Annotated rather than refused up front: the method list cannot tell a
/// registered-and-working method from a registered-and-always-erroring one, so
/// only the call settles it. Refusing on the static table's say-so would keep
/// blocking a method a later ethui implements, with no way past it.
fn annotate_documented_stub(method: &str, error: McpError) -> McpError {
    let documented_stub =
        catalog::meta(method).is_some_and(|meta| meta.kind == Kind::Unimplemented);

    if !documented_stub {
        return error;
    }

    let advice = catalog::replacement(method)
        .map(|substitute| format!("; use {substitute} instead"))
        .unwrap_or_default();

    McpError::internal_error(
        format!(
            "{} — {method} is documented as registered in ethui but always erroring{advice}",
            error.message
        ),
        None,
    )
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct AddressArgs {
    /// A 0x-prefixed EVM address.
    pub address: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct OptionalAddressArgs {
    /// A 0x-prefixed EVM address. Defaults to the active ethui account.
    pub address: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct TransactionArgs {
    /// A 0x-prefixed transaction hash.
    pub hash: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct CallArgs {
    /// The contract address to call.
    pub to: String,
    /// ABI-encoded calldata, 0x-prefixed.
    pub data: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SwitchNetworkArgs {
    /// The decimal chain id to switch to.
    pub chain_id: u64,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ListRpcMethodsArgs {
    /// Show only methods of one kind. Omit to list every method.
    pub kind: Option<Kind>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct RpcCallArgs {
    /// The JSON-RPC method name, e.g. `eth_getLogs`.
    pub method: String,
    /// Positional params, passed through verbatim. Defaults to `[]`.
    pub params: Option<Vec<Value>>,
}

#[tool_router(router = tool_router)]
impl<B: Backend> EthuiMcp<B> {
    pub fn new(backend: Arc<B>) -> Self {
        Self {
            registry: Arc::new(MethodRegistry::new(backend.clone())),
            backend,
            tool_router: Self::tool_router(),
        }
    }

    /// Issue a JSON-RPC call, mapping any failure to an agent-facing sentence.
    async fn request(&self, method: &str, params: Value) -> std::result::Result<Value, McpError> {
        self.backend
            .request(method, params)
            .await
            .map_err(tool_error)
    }

    /// Read a JSON string answer, or explain what came back instead.
    fn expect_str<'a>(value: &'a Value, what: &str) -> std::result::Result<&'a str, McpError> {
        value
            .as_str()
            .ok_or_else(|| tool_error(Error::malformed(format!("a non-string {what}: {value}"))))
    }

    /// The account ethui would sign with — the first one it exposes.
    async fn current_account(&self) -> ToolResult {
        let accounts = self.request("eth_accounts", json!([])).await?;

        accounts
            .as_array()
            .and_then(|accounts| accounts.first())
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| tool_error(Error::unsupported("no active ethui account")))
    }

    #[tool(description = "Get the EVM chain id ethui is currently connected to.")]
    pub async fn get_chain(&self) -> ToolResult {
        let raw = self.request("eth_chainId", json!([])).await?;
        let hex = Self::expect_str(&raw, "chain id")?;

        Ok(format::hex_to_u64(hex).map_err(tool_error)?.to_string())
    }

    #[tool(description = "List the wallet accounts ethui currently exposes.")]
    pub async fn get_accounts(&self) -> ToolResult {
        Ok(self.request("eth_accounts", json!([])).await?.to_string())
    }

    #[tool(
        description = "Get the ether balance of an address, defaulting to the active ethui account."
    )]
    pub async fn get_balance(
        &self,
        Parameters(args): Parameters<OptionalAddressArgs>,
    ) -> ToolResult {
        let address = match args.address {
            Some(address) => address,
            None => self.current_account().await?,
        };

        let raw = self
            .request("eth_getBalance", json!([address, "latest"]))
            .await?;
        let wei = Self::expect_str(&raw, "balance")?;

        Ok(format!(
            "{} ETH",
            format::hex_wei_to_eth(wei).map_err(tool_error)?
        ))
    }

    #[tool(description = "Fetch a transaction by hash.")]
    pub async fn get_transaction(
        &self,
        Parameters(args): Parameters<TransactionArgs>,
    ) -> ToolResult {
        Ok(self
            .request("eth_getTransactionByHash", json!([args.hash]))
            .await?
            .to_string())
    }

    #[tool(description = "Perform a read-only eth_call against a contract.")]
    pub async fn call(&self, Parameters(args): Parameters<CallArgs>) -> ToolResult {
        let raw = self
            .request(
                "eth_call",
                json!([{"to": args.to, "data": args.data}, "latest"]),
            )
            .await?;

        Ok(Self::expect_str(&raw, "call result")?.to_owned())
    }

    #[tool(description = "Get the ABI ethui knows for a contract address, if any.")]
    pub async fn get_contract_abi(&self, Parameters(args): Parameters<AddressArgs>) -> ToolResult {
        Ok(self
            .request("ethui_getContractAbi", json!([{"address": args.address}]))
            .await?
            .to_string())
    }

    #[tool(description = "Resolve ethui's human-readable alias for an address, if set.")]
    pub async fn resolve_alias(&self, Parameters(args): Parameters<AddressArgs>) -> ToolResult {
        let alias = self
            .request("ethui_getAddressAlias", json!([{"address": args.address}]))
            .await?;

        Ok(match &alias {
            Value::Null => "(no alias)".to_owned(),
            Value::String(alias) => alias.clone(),
            other => other.to_string(),
        })
    }

    #[tool(description = "Switch the active chain by chain id, like a dApp's \
                       wallet_switchEthereumChain. Applies immediately without an approval \
                       dialog. The effect depends on the affinity ethui holds for this \
                       connection: under global affinity it moves ethui's network for \
                       everything, which the desktop UI and every other connected dApp will \
                       follow; otherwise it pins this origin to the chain and that pin is \
                       persisted, outliving both this connection and the app itself. Either way \
                       it is not confined to this MCP session — confirm with the human before \
                       switching.")]
    pub async fn switch_network(
        &self,
        Parameters(args): Parameters<SwitchNetworkArgs>,
    ) -> ToolResult {
        let hex = format!("0x{:x}", args.chain_id);

        self.request("wallet_switchEthereumChain", json!([{"chainId": hex}]))
            .await?;

        Ok(format!("switched to chain {}", args.chain_id))
    }

    #[tool(
        description = "List every JSON-RPC method this ethui instance serves, with parameter \
                       shapes and whether each is a read, a write, or a registered-but-\
                       unimplemented stub. Use this before rpc_call. The method names come \
                       from the running app; the kinds, parameter shapes and notes beside them \
                       are static documentation that can lag what the app actually does."
    )]
    pub async fn list_rpc_methods(
        &self,
        Parameters(args): Parameters<ListRpcMethodsArgs>,
    ) -> ToolResult {
        let filter = args.kind;

        let snapshot = self.registry.snapshot().await;
        let shown: Vec<_> = snapshot
            .entries
            .iter()
            .filter(|entry| filter.is_none_or(|kind| entry.kind() == Some(kind)))
            .collect();

        let source = if snapshot.live {
            "live from ethui"
        } else {
            "STATIC FALLBACK — ethui_rpcMethods unavailable, this ethui build may predate it; \
             treat as a guess"
        };
        let header = format!(
            "{} of {} methods ({source})",
            shown.len(),
            snapshot.entries.len()
        );

        let lines: Vec<_> = shown
            .iter()
            .map(|entry| {
                let note = entry
                    .note()
                    .map(|note| format!(" — {note}"))
                    .unwrap_or_default();
                // Rendered from `REPLACEMENTS` rather than written into the
                // note, so the substitute has one home.
                let advice = catalog::replacement(&entry.name)
                    .map(|substitute| format!("; use {substitute} instead"))
                    .unwrap_or_default();
                format!(
                    "{} {} [{}]{note}{advice}",
                    entry.name,
                    entry.params(),
                    entry.kind_label()
                )
            })
            .collect();

        let drifted = snapshot.stale();
        let stale = if drifted.is_empty() {
            String::new()
        } else {
            format!(
                "\n\nDocumented but not served by this build: {}",
                drifted.join(", ")
            )
        };

        Ok(format!("{header}\n\n{}{stale}", lines.join("\n")))
    }

    #[tool(
        description = "Call any JSON-RPC method this ethui instance serves, including writes. \
                       Params are passed through verbatim. Call list_rpc_methods first to see \
                       method names and parameter shapes. Write methods open an approval dialog \
                       in the ethui app and may be rejected — skipped only under ethui's Fast \
                       Mode, which requires a dev wallet AND a dev network AND the setting \
                       enabled. Concurrent writes are not serialized, so issuing several at once \
                       stacks approval dialogs on the human; send them one at a time. Methods \
                       list_rpc_methods marks unimplemented are still attempted, since only the \
                       call itself can prove whether this build implements one."
    )]
    pub async fn rpc_call(&self, Parameters(args): Parameters<RpcCallArgs>) -> ToolResult {
        let method = args.method;

        let mut snapshot = self.registry.snapshot().await;
        if snapshot.live && !snapshot.contains(&method) {
            // The cache could predate an ethui restart, so pay for one refetch
            // before refusing a method that may now exist. Pointless on a
            // fallback snapshot: that one is never memoized, so it came from a
            // fetch that just failed, and retrying only doubles the stall.
            snapshot = self.registry.refresh().await;
        }

        if !snapshot.contains(&method) {
            let near = near_matches(&method, &snapshot);
            let hint = if near.is_empty() {
                " Call list_rpc_methods to see what is available.".to_owned()
            } else {
                format!(" Did you mean: {}?", near.join(", "))
            };

            // Only a live list can say what this build serves; on the static
            // fallback the app was never reached, so blaming the build would
            // send the agent hunting for a typo instead of telling the human
            // to start ethui.
            return Err(tool_error(if snapshot.live {
                Error::unsupported(format!("{method} is not served by this ethui build.{hint}"))
            } else {
                Error::unsupported(format!(
                    "ethui is not reachable — is the ethui app running? Its real method list is \
                     unknown; {method} is not in the static catalog either.{hint}"
                ))
            }));
        }

        let result = self
            .request(&method, Value::Array(args.params.unwrap_or_default()))
            .await;

        match result {
            Ok(value) => Ok(value.to_string()),
            Err(error) => Err(annotate_documented_stub(&method, error)),
        }
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

    const ALICE: &str = "0x1111111111111111111111111111111111111111";
    const BOB: &str = "0x2222222222222222222222222222222222222222";
    /// 1 ETH, in wei.
    const ONE_ETH: &str = "0xde0b6b3a7640000";

    fn args<T>(value: T) -> Parameters<T> {
        Parameters(value)
    }

    #[tokio::test]
    async fn get_accounts_lists_what_ethui_exposes() {
        let backend = Arc::new(MockBackend::returning(json!([ALICE, BOB])));
        let server = EthuiMcp::new(backend.clone());

        let accounts = server.get_accounts().await.unwrap();

        assert_eq!(
            backend.calls(),
            vec![("eth_accounts".to_owned(), json!([]))]
        );
        assert!(accounts.contains(ALICE) && accounts.contains(BOB));
    }

    #[tokio::test]
    async fn get_balance_reads_the_address_it_is_given() {
        let backend = Arc::new(MockBackend::returning(json!(ONE_ETH)));
        let server = EthuiMcp::new(backend.clone());

        let balance = server
            .get_balance(args(OptionalAddressArgs {
                address: Some(BOB.to_owned()),
            }))
            .await
            .unwrap();

        assert_eq!(balance, "1 ETH");
        assert_eq!(
            backend.calls(),
            vec![("eth_getBalance".to_owned(), json!([BOB, "latest"]))]
        );
    }

    #[tokio::test]
    async fn get_balance_defaults_to_the_active_account() {
        let backend = Arc::new(MockBackend::routing([
            ("eth_accounts", json!([ALICE, BOB])),
            ("eth_getBalance", json!(ONE_ETH)),
        ]));
        let server = EthuiMcp::new(backend.clone());

        server
            .get_balance(args(OptionalAddressArgs { address: None }))
            .await
            .unwrap();

        assert_eq!(
            backend.calls()[1],
            ("eth_getBalance".to_owned(), json!([ALICE, "latest"])),
            "the first exposed account is the active one"
        );
    }

    #[tokio::test]
    async fn get_balance_without_any_account_says_so() {
        let backend = Arc::new(MockBackend::returning(json!([])));
        let server = EthuiMcp::new(backend);

        let err = server
            .get_balance(args(OptionalAddressArgs { address: None }))
            .await
            .unwrap_err();

        assert_eq!(err.message, "no active ethui account");
    }

    #[tokio::test]
    async fn get_transaction_fetches_by_hash() {
        let backend = Arc::new(MockBackend::returning(json!({"hash": "0xdead"})));
        let server = EthuiMcp::new(backend.clone());

        let tx = server
            .get_transaction(args(TransactionArgs {
                hash: "0xdead".to_owned(),
            }))
            .await
            .unwrap();

        assert_eq!(
            backend.calls(),
            vec![("eth_getTransactionByHash".to_owned(), json!(["0xdead"]))]
        );
        assert!(tx.contains("0xdead"));
    }

    #[tokio::test]
    async fn call_forwards_to_and_data_against_the_latest_block() {
        let backend = Arc::new(MockBackend::returning(json!("0x2a")));
        let server = EthuiMcp::new(backend.clone());

        let result = server
            .call(args(CallArgs {
                to: BOB.to_owned(),
                data: "0x06fdde03".to_owned(),
            }))
            .await
            .unwrap();

        assert_eq!(result, "0x2a");
        assert_eq!(
            backend.calls(),
            vec![(
                "eth_call".to_owned(),
                json!([{"to": BOB, "data": "0x06fdde03"}, "latest"])
            )]
        );
    }

    #[tokio::test]
    async fn get_contract_abi_asks_ethui_for_the_abi() {
        let backend = Arc::new(MockBackend::returning(json!([{"name": "transfer"}])));
        let server = EthuiMcp::new(backend.clone());

        let abi = server
            .get_contract_abi(args(AddressArgs {
                address: BOB.to_owned(),
            }))
            .await
            .unwrap();

        assert_eq!(
            backend.calls(),
            vec![("ethui_getContractAbi".to_owned(), json!([{"address": BOB}]))]
        );
        assert!(abi.contains("transfer"));
    }

    #[tokio::test]
    async fn resolve_alias_returns_the_alias() {
        let backend = Arc::new(MockBackend::returning(json!("vault")));
        let server = EthuiMcp::new(backend.clone());

        let alias = server
            .resolve_alias(args(AddressArgs {
                address: BOB.to_owned(),
            }))
            .await
            .unwrap();

        assert_eq!(alias, "vault");
        assert_eq!(
            backend.calls(),
            vec![(
                "ethui_getAddressAlias".to_owned(),
                json!([{"address": BOB}])
            )]
        );
    }

    #[tokio::test]
    async fn resolve_alias_says_so_when_there_is_none() {
        let backend = Arc::new(MockBackend::returning(json!(null)));
        let server = EthuiMcp::new(backend);

        let alias = server
            .resolve_alias(args(AddressArgs {
                address: BOB.to_owned(),
            }))
            .await
            .unwrap();

        assert_eq!(alias, "(no alias)");
    }

    #[tokio::test]
    async fn switch_network_sends_the_chain_id_as_hex() {
        let backend = Arc::new(MockBackend::returning(json!(null)));
        let server = EthuiMcp::new(backend.clone());

        let confirmation = server
            .switch_network(args(SwitchNetworkArgs { chain_id: 8453 }))
            .await
            .unwrap();

        assert_eq!(
            backend.calls(),
            vec![(
                "wallet_switchEthereumChain".to_owned(),
                json!([{"chainId": "0x2105"}])
            )]
        );
        assert!(
            confirmation.contains("8453"),
            "the agent needs the chain confirmed back, got: {confirmation}"
        );
    }

    /// A backend whose method list is live and whose other calls succeed.
    fn serving(methods: Value, result: Value) -> Arc<MockBackend> {
        Arc::new(MockBackend::routing([
            ("ethui_rpcMethods", methods),
            ("eth_getLogs", result),
        ]))
    }

    #[tokio::test]
    async fn list_rpc_methods_renders_each_method_with_its_shape_and_kind() {
        let backend = serving(json!(["eth_getBalance"]), json!(null));
        let server = EthuiMcp::new(backend);

        let listing = server
            .list_rpc_methods(args(ListRpcMethodsArgs { kind: None }))
            .await
            .unwrap();

        assert!(
            listing.contains("eth_getBalance [address, blockTagOrNumber] [read]"),
            "got: {listing}"
        );
    }

    #[tokio::test]
    async fn list_rpc_methods_marks_a_live_listing_as_live() {
        let backend = serving(json!(["eth_chainId"]), json!(null));
        let server = EthuiMcp::new(backend);

        let listing = server
            .list_rpc_methods(args(ListRpcMethodsArgs { kind: None }))
            .await
            .unwrap();

        assert!(listing.contains("live from ethui"), "got: {listing}");
    }

    #[tokio::test]
    async fn list_rpc_methods_warns_when_it_is_only_guessing() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let server = EthuiMcp::new(backend);

        let listing = server
            .list_rpc_methods(args(ListRpcMethodsArgs { kind: None }))
            .await
            .unwrap();

        assert!(
            listing.contains("STATIC FALLBACK"),
            "an agent must not mistake a guess for the truth, got: {listing}"
        );
    }

    #[tokio::test]
    async fn list_rpc_methods_filters_by_kind() {
        let backend = serving(json!(["eth_chainId", "eth_sendTransaction"]), json!(null));
        let server = EthuiMcp::new(backend);

        let listing = server
            .list_rpc_methods(args(ListRpcMethodsArgs {
                kind: Some(Kind::Write),
            }))
            .await
            .unwrap();

        assert!(listing.contains("eth_sendTransaction"));
        assert!(!listing.contains("eth_chainId []"), "got: {listing}");
    }

    #[test]
    fn the_kind_filter_takes_the_labels_the_listing_prints() {
        // The agent reads these off the tool schema and passes them straight
        // back, so the two spellings have to agree.
        for kind in [Kind::Read, Kind::Write, Kind::Unimplemented] {
            let parsed: Kind = serde_json::from_value(json!(kind.as_str())).unwrap();
            assert_eq!(parsed, kind);
        }

        assert!(serde_json::from_value::<Kind>(json!("banana")).is_err());
    }

    #[tokio::test]
    async fn list_rpc_methods_reports_documented_methods_this_build_lacks() {
        let backend = serving(json!(["eth_chainId"]), json!(null));
        let server = EthuiMcp::new(backend);

        let listing = server
            .list_rpc_methods(args(ListRpcMethodsArgs { kind: None }))
            .await
            .unwrap();

        assert!(
            listing.contains("Documented but not served by this build"),
            "got: {listing}"
        );
    }

    #[tokio::test]
    async fn rpc_call_passes_a_served_method_through() {
        let backend = serving(json!(["eth_getLogs"]), json!([{"topic": "0x1"}]));
        let server = EthuiMcp::new(backend.clone());

        let result = server
            .rpc_call(args(RpcCallArgs {
                method: "eth_getLogs".to_owned(),
                params: Some(vec![json!({"fromBlock": "0x0"})]),
            }))
            .await
            .unwrap();

        assert!(result.contains("0x1"));
        assert!(
            backend
                .calls()
                .contains(&("eth_getLogs".to_owned(), json!([{"fromBlock": "0x0"}]))),
            "params must pass through verbatim, got: {:?}",
            backend.calls()
        );
    }

    #[tokio::test]
    async fn rpc_call_defaults_to_empty_params() {
        let backend = serving(json!(["eth_getLogs"]), json!(null));
        let server = EthuiMcp::new(backend.clone());

        server
            .rpc_call(args(RpcCallArgs {
                method: "eth_getLogs".to_owned(),
                params: None,
            }))
            .await
            .unwrap();

        assert!(
            backend
                .calls()
                .contains(&("eth_getLogs".to_owned(), json!([])))
        );
    }

    #[tokio::test]
    async fn rpc_call_refuses_a_method_this_build_does_not_serve() {
        let backend = serving(json!(["eth_chainId"]), json!(null));
        let server = EthuiMcp::new(backend);

        let err = server
            .rpc_call(args(RpcCallArgs {
                method: "eth_madeUp".to_owned(),
                params: None,
            }))
            .await
            .unwrap_err();

        assert!(
            err.message
                .contains("eth_madeUp is not served by this ethui build."),
            "got: {}",
            err.message
        );
    }

    #[tokio::test]
    async fn rpc_call_suggests_near_matches() {
        let backend = serving(json!(["eth_getTransactionReceipt"]), json!(null));
        let server = EthuiMcp::new(backend);

        let err = server
            .rpc_call(args(RpcCallArgs {
                method: "getTransactionReceipt".to_owned(),
                params: None,
            }))
            .await
            .unwrap_err();

        assert!(
            err.message.contains("eth_getTransactionReceipt"),
            "got: {}",
            err.message
        );
    }

    #[tokio::test]
    async fn rpc_call_refetches_once_before_refusing() {
        let backend = serving(json!(["eth_chainId"]), json!(null));
        let server = EthuiMcp::new(backend.clone());

        // Warm the cache, then ask for something absent from it.
        server
            .list_rpc_methods(args(ListRpcMethodsArgs { kind: None }))
            .await
            .unwrap();
        let before = backend.calls().len();

        server
            .rpc_call(args(RpcCallArgs {
                method: "eth_madeUp".to_owned(),
                params: None,
            }))
            .await
            .unwrap_err();

        assert_eq!(
            backend.calls().len() - before,
            1,
            "the cache could predate an ethui restart, so pay for exactly one refetch"
        );
    }

    #[tokio::test]
    async fn rpc_call_annotates_a_failing_stub_with_its_replacement() {
        // `serving` routes only `eth_getLogs`, so `eth_gasPrice` fails the way
        // a registered-but-unimplemented method does in the app.
        let backend = serving(json!(["eth_gasPrice"]), json!(null));
        let server = EthuiMcp::new(backend);

        let err = server
            .rpc_call(args(RpcCallArgs {
                method: "eth_gasPrice".to_owned(),
                params: None,
            }))
            .await
            .unwrap_err();

        assert!(
            err.message.contains("use eth_estimateGas instead"),
            "a dead end should point somewhere, got: {}",
            err.message
        );
    }

    #[tokio::test]
    async fn rpc_call_attempts_a_documented_stub_rather_than_refusing_on_the_catalog() {
        // The catalog is documentation, not truth: if this build implements
        // what the static table calls a stub, the call must still go through.
        let backend = Arc::new(MockBackend::routing([
            ("ethui_rpcMethods", json!(["eth_gasPrice"])),
            ("eth_gasPrice", json!("0x3b9aca00")),
        ]));
        let server = EthuiMcp::new(backend.clone());

        let result = server
            .rpc_call(args(RpcCallArgs {
                method: "eth_gasPrice".to_owned(),
                params: None,
            }))
            .await
            .unwrap();

        assert!(result.contains("0x3b9aca00"), "got: {result}");
        assert!(
            backend
                .calls()
                .contains(&("eth_gasPrice".to_owned(), json!([]))),
            "the call must reach ethui, not stop at the static table"
        );
    }

    #[tokio::test]
    async fn every_unimplemented_method_annotates_cleanly() {
        // A catalog entry phrased differently from the rest could produce a
        // garbled annotation without any single-method test noticing.
        for method in catalog::names()
            .filter(|name| catalog::meta(name).is_some_and(|m| m.kind == Kind::Unimplemented))
        {
            let backend = serving(json!([method]), json!(null));
            let server = EthuiMcp::new(backend);

            let err = server
                .rpc_call(args(RpcCallArgs {
                    method: method.to_owned(),
                    params: None,
                }))
                .await
                .unwrap_err();

            let expected = match catalog::replacement(method) {
                Some(substitute) => format!(
                    "{method} is documented as registered in ethui but always erroring; use \
                     {substitute} instead"
                ),
                None => {
                    format!("{method} is documented as registered in ethui but always erroring")
                }
            };

            assert!(
                err.message.ends_with(&expected),
                "annotating {method}, got: {}",
                err.message
            );
        }
    }

    #[tokio::test]
    async fn rpc_call_blames_an_unreachable_ethui_not_the_build() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let server = EthuiMcp::new(backend);

        let err = server
            .rpc_call(args(RpcCallArgs {
                method: "eth_madeUp".to_owned(),
                params: None,
            }))
            .await
            .unwrap_err();

        assert!(
            err.message.contains("ethui is not reachable"),
            "got: {}",
            err.message
        );
        assert!(
            !err.message.contains("not served by this ethui build"),
            "got: {}",
            err.message
        );
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
        assert!(
            info.capabilities.tools.is_some(),
            "tools capability must be advertised"
        );
    }

    #[test]
    fn exposes_the_curated_tools_plus_the_rpc_escape_hatch() {
        let server = EthuiMcp::new(Arc::new(MockBackend::returning(json!("0x1"))));

        let names: Vec<_> = server
            .tool_router
            .list_all()
            .into_iter()
            .map(|tool| tool.name.to_string())
            .collect();

        // Curated names beat raw eth_* ones for tool selection, and the list
        // stays short enough not to crowd an agent's context. Anything else
        // ethui serves is reachable through rpc_call.
        assert_eq!(
            names,
            vec![
                "call",
                "get_accounts",
                "get_balance",
                "get_chain",
                "get_contract_abi",
                "get_transaction",
                "list_rpc_methods",
                "resolve_alias",
                "rpc_call",
                "switch_network",
            ]
        );
    }

    #[test]
    fn every_tool_describes_itself() {
        let server = EthuiMcp::new(Arc::new(MockBackend::returning(json!("0x1"))));

        for tool in server.tool_router.list_all() {
            assert!(
                tool.description.as_ref().is_some_and(|d| !d.is_empty()),
                "{} has no description for the agent to select on",
                tool.name
            );
        }
    }
}
