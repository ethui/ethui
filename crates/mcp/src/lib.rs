pub mod backend;
pub mod catalog;
pub mod error;
pub mod format;
pub mod registry;
pub mod server;
pub mod ws;

#[cfg(test)]
mod mock;
#[cfg(test)]
mod testing;

/// The WS port ethui listens on, per build profile.
///
/// Mirrors `default_ws_port` in `crates/args/src/lib.rs`. A debug sidecar talks
/// to a debug app.
pub const fn default_ws_port() -> u16 {
    if cfg!(debug_assertions) { 9102 } else { 9002 }
}

/// Resolve a port from an `ETHUI_WS_PORT` value, falling back to the default.
///
/// A malformed value falls back rather than failing: the sidecar is launched by
/// Claude with no terminal to complain to, and a clear "not reachable" error on
/// the first tool call is more useful than a silent startup crash.
pub fn parse_ws_port(value: Option<String>) -> u16 {
    value
        .and_then(|value| value.parse().ok())
        .unwrap_or_else(default_ws_port)
}

/// Resolve the port from the process environment.
pub fn ws_port_from_env() -> u16 {
    parse_ws_port(std::env::var("ETHUI_WS_PORT").ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_port_follows_the_build_profile() {
        // Matches crates/args/src/lib.rs, so the sidecar and the app agree.
        let expected = if cfg!(debug_assertions) { 9102 } else { 9002 };
        assert_eq!(default_ws_port(), expected);
    }

    #[test]
    fn env_override_wins_over_the_default() {
        assert_eq!(parse_ws_port(Some("9002".to_owned())), 9002);
    }

    #[test]
    fn an_unparseable_env_value_falls_back_to_the_default() {
        assert_eq!(parse_ws_port(Some("banana".to_owned())), default_ws_port());
    }

    #[test]
    fn a_missing_env_value_falls_back_to_the_default() {
        assert_eq!(parse_ws_port(None), default_ws_port());
    }
}
