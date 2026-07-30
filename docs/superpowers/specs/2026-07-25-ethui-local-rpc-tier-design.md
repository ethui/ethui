# Local RPC tier: agent-reachable wallet and settings control

**Status:** approved, not yet planned
**Date:** 2026-07-25

## Problem

`ethui_rpc::Handler` serves 57 methods. The app registers 78 Tauri commands. Only
11 of those commands have an RPC equivalent, so everything an agent might want to
do beyond signing and reading chain state is unreachable through MCP — MCP's
`rpc_call` is a passthrough over the same handler, so its reach is exactly the
handler's reach.

Six commands are worth closing first:

| Tauri command | Why an agent needs it |
| --- | --- |
| `settings_set_fast_mode` | Skip approval dialogs during unattended dev work |
| `networks_set_current` | Switch by name; chain id cannot disambiguate two networks sharing one |
| `wallets_create` | Set up test signers |
| `wallets_get_all` | Discover what signers exist |
| `wallets_set_current_wallet` | Choose the active signer |
| `wallets_set_current_path` | Choose the active derivation path |

The blocker is not the methods. It is that the handler serving them also serves
the browser extension — that is, every website the user visits — and
WalletConnect. Registering these six the way existing methods are registered
would hand every open tab the ability to enumerate wallets, plant a signer, make
it current, and turn off the approval dialogs.

## Approach

Introduce a trust tier on the RPC context. Methods registered as local-only are
invisible to origin callers. The six methods land in that tier.

### 1. Trust boundary

Add to `crates/connections/src/ctx.rs`, alongside the existing `domain` and
`permissions`:

```rust
pub enum Trust {
    Local,
    Origin(String),
}
```

`Trust::Local` cannot be derived from the WebSocket handshake as it stands.
`ethui-mcp` is a separate binary that connects over the same socket as the
extension, at `ws://127.0.0.1:<port>/?url=mcp%3A%2F%2Fclaude&origin=claude-mcp`
(`crates/mcp/src/ws.rs:144`). `Peer::domain()` parses that to `Some("claude")`,
so MCP is indistinguishable from an origin by domain alone, and the query string
is caller-supplied anyway — the server binds 127.0.0.1 and authenticates nothing.

**Token file.** At startup ethui writes a random token to its config dir at mode
0600, via the existing `resource(app, "ws-token", &args)` helper in
`bin/src/app.rs:281`. `crates/ws/src/server.rs:38` already collects query params
in the handshake callback; it reads `token` there, compares constant-time, and
`Peer` carries the verdict into `Handler::new(domain, trust)`.

A webpage cannot read the filesystem, so the extension can never present the
token. Any local process running as the user can — the same trust level as the
keystore files already on disk. WalletConnect sessions
(`crates/walletconnect/src/session.rs:509`) are always `Origin`.

`ethui-mcp` resolves the config dir from `ETHUI_CONFIG_DIR`, promoted to a
`CONFIG_DIR_ENV` const in `ethui-args` for the same reason `WS_PORT_ENV` is
public: peers read the name rather than hardcode it. In debug builds the default
config dir is the relative path `../dev-data/default`
(`bin/src/app.rs:288-295`), which does not resolve from wherever an MCP client
launches the binary — dev setups must set `ETHUI_CONFIG_DIR` explicitly, and
`ethui-mcp` fails with that instruction rather than silently degrading to
`Origin`.

**Registration.** A new `local_method!` arm in `Handler::add_handlers` registers
into the same `MetaIoHandler` but returns **-32601 method-not-found** to
non-Local callers. Not "unauthorized": an origin should not be able to
fingerprint what exists.

`ethui_rpcMethods` currently renders one payload at registration time
(`crates/rpc/src/lib.rs:171-177`). It becomes two payloads, full and
origin-filtered, both precomputed, selected by `ctx.trust`. Per-call cost stays
zero.

### 2. The six methods

All registered with `local_method!`. None open a dialog.

| Method | Params | Returns |
| --- | --- | --- |
| `ethui_listWallets` | `[]` | `[{name, type, currentAddress, paths}]` |
| `ethui_createWallet` | `[{type, …per-type}]` | `null` |
| `ethui_setCurrentWallet` | `[{name}]` | `null` |
| `ethui_setCurrentPath` | `[{key}]` | `null` |
| `ethui_setCurrentNetwork` | `[{name}]` | the network |
| `ethui_setFastMode` | `[{enabled}]` | `null` |

`ethui_createWallet` forwards its `Json` verbatim to
`Wallets::write().create(params)`, reusing the `params["type"]` dispatch the GUI
already uses (`crates/wallets/src/wallet.rs:74`). All six wallet types work with
no new parsing: `plaintext`, `jsonKeystore`, `HDWallet`, `impersonator`,
`ledger`, `privateKey`.

`ethui_setCurrentWallet` takes a name and resolves it to the index
`wallets_set_current_wallet` expects, inside the method. An index read in one
call can be stale by the next if the GUI mutates the list; a name cannot.
Unknown names error with near-matches, reusing the spell-check helper at
`crates/mcp/src/server.rs:55`.

`ethui_setCurrentNetwork` switches by name. `wallet_switchEthereumChain` stays
as it is — it is the dApp-facing method and keeps chain-id semantics.

### 3. The listWallets projection

`wallets_get_all` returns `Vec<Wallet>`, and those structs serialize their
secrets:

- `PlaintextWallet.mnemonic` — plaintext, no `#[serde(skip)]`
  (`crates/wallets/src/wallets/plaintext.rs:13-19`)
- `HDWallet.ciphertext`, `PrivateKeyWallet.ciphertext` — password-encrypted, but
  an offline brute-force target once off the machine
- `JsonKeystoreWallet.file` — a filesystem path

Acceptable for a Tauri command feeding the app's own GUI. Not acceptable on a
wire. `ethui_listWallets` returns a new `WalletSummary` built through the
`WalletControl` trait (`name()`, `wallet_type()`, `get_current_address()`,
addresses) and deliberately does not reuse `Wallet`'s `Serialize`.

A test asserts the serialized summary contains none of `mnemonic`, `ciphertext`,
or `file`, so a later refactor that swaps `WalletSummary` back for `Wallet` fails
loudly instead of quietly leaking seed phrases.

### 4. Log redaction

`self_handler!` and `method_handler!` log params and results unconditionally
(`crates/rpc/src/lib.rs:55`, `:68`), and `logging_get_snapshot` reads those logs
back. A mnemonic passed to `ethui_createWallet` would land on disk in the clear.

A `redact` variant of the registration macro logs `method` and `params.type`
only, and `ethui_createWallet` uses it. `ethui_listWallets` results stay
loggable — the projection in section 3 has no secrets, which is the point.

### 5. MCP surface

Five new tools in `crates/mcp/src/server.rs`: `list_wallets`, `create_wallet`,
`set_current_wallet`, `set_current_path`, `set_fast_mode`. `create_wallet` is the
one that most needs a typed schema, since its params differ per wallet type.

The existing `switch_network` tool grows an optional `name` alongside `chainId`,
rather than gaining an overlapping sibling; it rejects calls setting neither or
both.

Six new `catalog.rs` entries, name-sorted — the existing `names_are_sorted_*`
tests enforce this. The live-registry path needs no change: MCP presents the
token, so `ethui_rpcMethods` returns it the unfiltered list.

### 6. Testing

- An origin peer receives -32601 for each of the six; a Local peer gets through.
- Token absent, token wrong, token correct.
- `ethui_rpcMethods` filtered per trust — extends the existing
  `rpc_methods_serves_the_whole_registry` test rather than replacing it.
- Name-to-index resolution, including the unknown-name error and its
  near-matches.
- A `createWallet` call carrying a mnemonic produces a log line not containing
  it.
- The projection leak guard from section 3.
- Catalog sortedness and coverage of the new names.

## Scope

Roughly 14 files. `bin/src/app.rs` gains the token write; every existing Tauri
command is untouched, and the GUI keeps its own path to all six operations.

## Rejected alternatives

**Register the six ungated, rely on approval dialogs.** Cheapest, and how every
existing method works. Rejected because `settings_set_fast_mode` is the switch
that disables dialogs, and `wallets_create` plus `wallets_set_current_wallet`
together let a page swap the active signer — neither is something a dialog on a
*different* method can defend.

**A second `MetaIoHandler` that only MCP mounts.** No `Ctx` change and a smaller
blast radius, but it splits the registry in two: `ethui_rpcMethods` has to merge
them, and the catalog and registry tests have to know which handler a name lives
on.

**Build `LocalBackend` first.** The in-process backend described at
`crates/mcp/src/backend.rs:10` would make `Trust::Local` unforgeable by
construction rather than by shared secret. It also changes `ethui-mcp`'s entire
transport story — a stdio bridge into the app, or the app hosting MCP directly —
which is far more than these six methods justify. The `Trust` enum and the
`local_method!` registrations are written once and survive that swap; only how
`Trust::Local` is *decided* would change.

**Dialogs on the five writes.** Rejected in favour of shipping without GUI work.
See the risk below.

## Accepted risk

With no dialogs, an agent holding the token can create a signer, make it
current, and enable Fast Mode — which then skips the approval dialog on
`eth_sendTransaction`. A prompt-injected agent gets that whole surface with no
human in the loop. The token file is the entire boundary.

This is a deliberate trade for setup ergonomics: the alternative stacks three
dialogs on the user for one logical task. Revisiting it means adding a dialog to
`ethui_setFastMode` first, since that is the method that disarms the others.
