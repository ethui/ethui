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

`get_chain` — the current EVM chain id, as a decimal string.

The wider tool catalog (accounts, balances, calls, and the approval-gated
`send_transaction` / `sign_message` / `sign_typed_data`) is separate work.

## Development notes

Two constraints are easy to break and produce confusing failures:

- **Nothing may write to stdout except the MCP transport.** No `println!`, and
  in particular never call `ethui_tracing::setup()` from this binary — it
  installs a stdout tracing layer. All logging goes to stderr.
- **This binary must not carry a `windows_subsystem` attribute.** `bin/` sets
  one for release builds, which detaches stdio on Windows.

`rmcp` is pinned to an exact version because it is pre-release and its API moves
between betas.
