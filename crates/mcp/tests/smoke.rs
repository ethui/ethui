//! End-to-end smoke test for the `ethui-mcp` binary itself.
//!
//! Everything in `src/` is unit-tested through library types, but three
//! things only exist once `main` actually runs as a separate process: the
//! stderr-only tracing subscriber, `ws_port_from_env`'s `"ETHUI_WS_PORT"`
//! spelling as consumed by `main`, and the `serve(stdio())` wiring. Above
//! all, the crate's one hard invariant — nothing but the MCP transport may
//! ever write to stdout — is unenforceable from a unit test: it can only be
//! checked against the real process's real stdout.

use std::{
    io::{Read as _, Write as _},
    process::{Command, Stdio},
    time::{Duration, Instant},
};

/// Bind a port and immediately drop the listener, so the port is valid but
/// nothing is listening on it. Mirrors `an_unreachable_app_is_a_disconnect_
/// not_a_hang` in `src/ws.rs`. Never 9102 or 9002: those are real ports the
/// ethui desktop app itself may be using.
fn unused_port() -> u16 {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    listener.local_addr().unwrap().port()
}

/// Read `child`'s stdout and stderr to completion, killing it if it outlives
/// `timeout` — a hang here must fail the test, not wedge CI.
fn read_to_completion(child: &mut std::process::Child, timeout: Duration) -> (String, String) {
    let mut stdout_pipe = child.stdout.take().expect("stdout was not piped");
    let mut stderr_pipe = child.stderr.take().expect("stderr was not piped");

    let stdout_thread = std::thread::spawn(move || {
        let mut buf = String::new();
        let _ = stdout_pipe.read_to_string(&mut buf);
        buf
    });
    let stderr_thread = std::thread::spawn(move || {
        let mut buf = String::new();
        let _ = stderr_pipe.read_to_string(&mut buf);
        buf
    });

    let started = Instant::now();
    loop {
        if let Ok(Some(_)) = child.try_wait() {
            break;
        }
        if started.elapsed() > timeout {
            let _ = child.kill();
            let _ = child.wait();
            panic!("ethui-mcp did not exit within {timeout:?} — treating this as a hang");
        }
        std::thread::sleep(Duration::from_millis(20));
    }

    let stdout = stdout_thread.join().expect("stdout reader thread panicked");
    let stderr = stderr_thread.join().expect("stderr reader thread panicked");
    (stdout, stderr)
}

#[test]
fn stdout_carries_only_json_and_stderr_reports_the_configured_port() {
    let port = unused_port();

    let mut child = Command::new(env!("CARGO_BIN_EXE_ethui-mcp"))
        .env("RUST_LOG", "debug")
        .env("ETHUI_WS_PORT", port.to_string())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("failed to spawn the ethui-mcp binary");

    let mut stdin = child.stdin.take().expect("stdin was not piped");

    let initialize = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": { "name": "ethui-mcp-smoke-test", "version": "0.0.0" },
        },
    });
    let initialized = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
    });
    let call_get_chain = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": { "name": "get_chain", "arguments": {} },
    });

    for frame in [&initialize, &initialized, &call_get_chain] {
        writeln!(stdin, "{frame}").expect("failed to write to the child's stdin");
    }
    drop(stdin);

    let (stdout, stderr) = read_to_completion(&mut child, Duration::from_secs(15));

    // The stdout-purity invariant: every non-empty line must be a complete,
    // valid JSON value. A stray `println!` or a panic message landing on
    // stdout would corrupt the protocol for the whole session; this is the
    // only place in the suite that can catch it, because it is the only
    // place that looks at the real process's real stdout.
    let mut saw_get_chain_response = false;
    for line in stdout.lines().filter(|line| !line.trim().is_empty()) {
        let value: serde_json::Value = serde_json::from_str(line)
            .unwrap_or_else(|e| panic!("stdout line was not valid JSON ({e}): {line:?}"));

        if value.get("id") == Some(&serde_json::json!(2)) {
            saw_get_chain_response = true;
            let rendered = value.to_string();
            assert!(
                rendered.contains("ethui is not reachable — is the ethui app running?"),
                "the tools/call response should carry the disconnect sentence, got: {rendered}"
            );
        }
    }
    assert!(
        saw_get_chain_response,
        "never saw a response to the tools/call request; stdout was:\n{stdout}\nstderr was:\n{stderr}"
    );

    // Proves the literal `"ETHUI_WS_PORT"` spelling `ws_port_from_env` reads
    // and `WsBackend::new`'s wiring of it, end to end through `main`: if
    // main ever stopped reading that env var, or stopped passing it into
    // `WsBackend::new`, the backend would fall back to the default port
    // instead, and this specific port would never appear in the log.
    assert!(
        stderr.contains(&port.to_string()),
        "stderr should mention the configured port {port}, got:\n{stderr}"
    );
}
