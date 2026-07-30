# ethui-mcp

Local MCP stdio server that lets a Claude session drive ethui wallet
operations.

It connects to a running ethui app over its WebSocket JSON-RPC port — the same
one the browser extension uses — as a peer identified `mcp://claude`. It holds
no keys and never signs: signing and sending are gated by ethui's approval
dialog, where the `claude` origin is shown.

## Requirements

- ethui running locally. Dev builds listen on WS port 9102, release builds on
  9002. Override with `ETHUI_WS_PORT`.

## Build

    cargo build --release -p ethui-mcp

The binary lands at `target/release/ethui-mcp`. It is not part of a plain
`cargo build`: the workspace's `default-members` is `["bin"]`.

## Register with Claude Code

    claude mcp add ethui -- /absolute/path/to/target/release/ethui-mcp

Against a dev build of the app:

    claude mcp add ethui --env ETHUI_WS_PORT=9102 -- /absolute/path/to/target/release/ethui-mcp

## Register with Claude Desktop

Add to `claude_desktop_config.json`:

    {
      "mcpServers": {
        "ethui": {
          "command": "/absolute/path/to/target/release/ethui-mcp",
          "env": { "ETHUI_WS_PORT": "9102" }
        }
      }
    }

## Tools

Reads, none of which prompt the human:

- `get_chain` — the current EVM chain id, as a decimal string.
- `get_accounts` — the wallet accounts ethui exposes.
- `get_balance` — ether balance of an address, defaulting to the active account.
- `get_transaction` — a transaction by hash.
- `call` — a read-only `eth_call` against a contract.
- `get_contract_abi` — the ABI ethui knows for an address, if any.
- `resolve_alias` — ethui's human-readable alias for an address, if set.

State-changing:

- `switch_network` — switch the active chain. No approval dialog, and **not**
  confined to this MCP session: under global affinity it moves ethui's network
  for everything, otherwise it persists a per-origin pin that outlives both the
  connection and the app.
- `rpc_call` — the escape hatch: any JSON-RPC method this ethui serves,
  including writes such as `eth_sendTransaction` and the signing methods. Those
  open ethui's approval dialog, showing the `claude` origin, and can be
  rejected — bypassed only under Fast Mode (dev wallet AND dev network AND the
  setting enabled). Approvals are not serialized, so concurrent writes stack
  dialogs on the human.

Discovery:

- `list_rpc_methods` — every JSON-RPC method this instance serves, with
  parameter shapes and a read/write/unimplemented label. Names come from the
  running app via `ethui_rpcMethods`; the shapes and labels beside them are
  static documentation from `src/catalog.rs` and can lag the app. When ethui
  cannot be reached the listing falls back to that catalog and says so.

## Development notes

Two constraints are easy to break and produce confusing failures:

- **Nothing may write to stdout except the MCP transport.** No `println!`, and
  in particular never call `ethui_tracing::setup()` from this binary — it
  installs a stdout tracing layer. All logging goes to stderr.
- **This binary must not carry a `windows_subsystem` attribute.** `bin/` sets
  one for release builds, which detaches stdio on Windows.

`rmcp` is pinned to an exact version because it is pre-release and its API moves
between betas.
