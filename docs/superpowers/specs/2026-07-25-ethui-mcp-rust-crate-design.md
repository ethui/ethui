# ethui MCP — Rust crate — design

Date: 2026-07-25

## Goal

Provide the MCP server as a Rust crate in the ethui workspace, so it ships as
part of the app, shares types with the rest of the codebase, and can eventually
run in-process against ethui's internals.

This spec covers **architecture only**, plus one smoke tool that proves the
whole path end to end. The tool catalog is separate follow-up work.

## Motivation

- **Distribution with the app** — the MCP server should ship inside the Tauri
  bundle rather than requiring a separate build step.
- **One binary** — no additional language runtime to install alongside the app.
- **One language** — share `ethui-types` (alloy re-exports) instead of
  redefining address and quantity handling separately.
- **Direct access to internals** — eventually reach db/simulator without a
  socket hop.

## Roadmap context

ethui is expected to eventually run headless — the app booted without a
frontend, driven only through MCP. This spec does not implement that, but the
`Backend` seam below is chosen so headless is an added implementation rather
than a rewrite.

## Constraints discovered in the codebase

These shaped the design and must be respected by the implementation.

- **Single-instance lock.** `bin/src/app.rs:22` uses a `NamedLock`; a second
  process cannot own the core. Combined with the SQLite file, a Claude-spawned
  process can never boot its own ethui core alongside a running app.
- **Dialogs require a UI.** `ethui-dialogs` broadcasts `UIMsg::DialogOpen`; only
  `bin/src/app.rs:event_listener` turns that into a window. No UI means no
  approval path for write operations.
- **`windows_subsystem`.** `bin/src/lib.rs:2` sets
  `windows_subsystem = "windows"` for release builds — no stdio attached. An MCP
  stdio server compiled under that attribute is dead on Windows release.
- **Tracing writes to stdout.** `ethui_tracing::setup()`
  (`crates/tracing/src/lib.rs:37`) installs a `fmt` layer on stdout. On a stdio
  MCP server that interleaves log lines with JSON-RPC frames and corrupts the
  protocol.

The first two rule out a Claude-spawned process that touches internals
directly. The last two rule out reusing the existing `ethui` binary for stdio.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Process shape | External stdio process, WS to the running app | The two constraints above forbid a second core-owning process |
| Binary | Separate `[[bin]] ethui-mcp` | Avoids `windows_subsystem` and Tauri linkage; small, fast startup |
| Internals access | `Backend` trait, `WsBackend` now | `LocalBackend` later calls the RPC `Handler` in-process; no forked tool logic |
| Tool definitions | rmcp `#[tool_router]` macros | Idiomatic for the SDK |
| App not running | Error clearly | Never spawn a wallet GUI on the agent's behalf |

## Architecture

```
Claude session
   │  MCP (stdio, JSON-RPC)
   ▼
ethui-mcp  (short-lived process, Rust)
   │  Backend::request(method, params)
   ▼
WsBackend  ──►  ws://127.0.0.1:${ETHUI_WS_PORT}?url=mcp://claude&origin=claude-mcp
   ▼
ethui app  ──►  ethui-ws  ──►  ethui-rpc Handler
                                  ├─ read methods  → provider passthrough
                                  └─ write methods → ethui-dialogs (human approval)
```

Port defaults follow `crates/args`: `9102` debug, `9002` release, overridable
via `ETHUI_WS_PORT`.

Peer identity is unchanged: connecting with `?url=mcp://claude` yields
`Peer::domain() == "claude"`, threaded into `Ctx.domain` and shown in every
approval dialog.

### The Backend seam

```rust
#[async_trait]
pub trait Backend: Send + Sync + 'static {
    async fn request(&self, method: &str, params: Value) -> Result<Value>;
}
```

One method, at JSON-RPC granularity — deliberately not a semantic facade
(`accounts()`, `balance()`, …).

`WsBackend` implements it over the WebSocket. When headless mode lands,
`LocalBackend` implements the same trait by calling `ethui_rpc::Handler::handle`
directly in-process: no socket, no serialization hop. Tools are written once
against the trait and work under both.

A semantic trait would require every method implemented twice for no present
gain. Reaching new internals means adding an `ethui_*` method to the shared
`Handler`, which benefits both backends rather than only the local one.

## Components

`crates/mcp/` — lib plus binary:

| File | Responsibility |
|---|---|
| `src/lib.rs` | `serve_stdio(backend)` — wires the rmcp server to a stdio transport |
| `src/main.rs` | Env/arg parsing, stderr tracing subscriber, constructs `WsBackend`, calls `serve_stdio` |
| `src/backend.rs` | The `Backend` trait |
| `src/ws.rs` | `WsBackend` — connection, id correlation, ping/pong, lazy reconnect |
| `src/tools.rs` | `#[tool_router]` handlers — `get_chain` only in this phase |
| `src/error.rs` | `Error` enum and its mapping to MCP tool errors |

Each unit is independently testable: `ws.rs` against a mock WS server,
`tools.rs` against a mock `Backend`.

### Dependencies

- `rmcp = "=3.0.0-beta.2"` — official Rust MCP SDK. **Pinned to an exact
  version**: it is pre-release and the API is still moving.
- `schemars` 1.x — JSON Schema derivation for tool inputs.
- `tokio-tungstenite` — WebSocket client.
- `ethui-types` — alloy re-exports for address and quantity handling.
- `async-trait`, `serde`, `serde_json`, `tokio`, `tracing`, `thiserror`.

### Workspace wiring

- Add `crates/mcp` to `[workspace] members` in the root `Cargo.toml`.
- Add `ethui-mcp = { path = "crates/mcp" }` to `[workspace.dependencies]` for
  consistency with sibling crates, even though nothing depends on it yet.
- `default-members` stays `["bin"]`, so `cargo build` does not build this.
  Build explicitly: `cargo build --release -p ethui-mcp`.

## Binary requirements

Two non-obvious requirements, both consequences of constraints above:

1. **No `windows_subsystem` attribute** on this binary. It must be
   console-subsystem so stdio is attached on Windows release builds.
2. **Do not call `ethui_tracing::setup()`.** `main.rs` installs its own
   `tracing_subscriber` writing to `std::io::stderr`. Nothing may ever write to
   stdout except the MCP transport.

Requirement 2 is a correctness invariant, not a style preference: a single
stray `println!` breaks the protocol for the whole session.

## WS client behaviour

`WsBackend` must provide:

- **Id correlation** — monotonic request id; in-flight requests tracked in a
  `HashMap<u64, oneshot::Sender<Result<Value>>>`.
- **Keepalive** — `ethui-ws` sends a literal `ping` *text* frame and expects a
  `pong` text frame back. This is the application-level protocol, not WebSocket
  control frames. Responding at the control-frame layer alone is not enough.
- **Socket-scoped listeners** — a reader task belongs to the socket that spawned
  it and ignores messages once superseded, so a reconnect does not tear down
  pending requests belonging to the new socket.
- **Lazy reconnect** — no timed backoff. A request that finds the socket closed
  reconnects on demand; failure surfaces as a tool error.
- **Timeout** — 120s per request. Long enough for a human to act on an approval
  dialog.
- **`close()`** rejects every pending request rather than leaving them hanging.

Non-JSON frames and frames without a numeric `id` (event notifications) are
ignored.

## Smoke tool

One tool this phase: `get_chain`.

- Input: none.
- Behaviour: `eth_chainId` via `Backend::request`, hex result converted to
  decimal.
- Output: the chain id as a decimal string.

It is chosen because it exercises the full path — stdio transport, tool
dispatch, backend request, id correlation, result formatting — with no write
path and no dialog.

## Error handling

```rust
pub enum Error {
    Rpc { code: i64, message: String },
    Disconnected,
    Timeout,
}
```

Mapping to tool errors:

| Condition | Message |
|---|---|
| `Disconnected` (reconnect failed) | `ethui is not reachable — is the ethui app running?` |
| `Rpc { code, message }` | `RPC error {code}: {message}` |
| `Timeout` | `request timed out` |

Never a raw backtrace or a debug-formatted struct. The agent surfaces these
strings to the user, so they must read as sentences.

`ethui-mcp` never launches the ethui app. Silently spawning a wallet GUI on an
agent's behalf is surprising, and a wallet that appears unbidden is exactly the
wrong affordance.

## Testing

**`ws.rs`**, against a `tokio-tungstenite` echo server:

- concurrent requests resolve to the correct responses (id correlation)
- a `ping` text frame is answered with `pong`
- a reconnect does not reject requests pending on the new socket
- `close()` rejects all pending requests with `Disconnected`
- a request against a closed server yields `Disconnected`, not a hang

**`tools.rs`**, against a `MockBackend` recording calls and returning canned
JSON:

- `get_chain` issues `eth_chainId` and renders `0x1` as `1`

**Manual verification:**

```
cargo build --release -p ethui-mcp
claude mcp add ethui -- /absolute/path/to/target/release/ethui-mcp
```

With ethui running, ask the agent for the current chain and confirm the value
matches the app.

## Out of scope

Deferred deliberately; each is a separate piece of work.

- **The tool catalog** — reads and writes beyond `get_chain`.
- **Write serialization** — the `tokio::sync::Mutex` that serializes in-flight
  state-changing RPCs, so parallel agent calls produce an orderly dialog
  sequence. Lands with the first write tool; there is nothing to serialize until
  then.
- **`LocalBackend` and headless mode.**
- **In-app HTTP/SSE transport.**
- **Tauri bundling** — `bundle.externalBin` requires the binary renamed
  `ethui-mcp-<target-triple>` plus a copy step, and touches CI. Phase 1
  registration uses a documented absolute path.
