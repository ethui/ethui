use thiserror::Error;

/// Everything that can go wrong talking to ethui.
///
/// The `Display` strings are user-facing: they are handed to the agent, which
/// shows them to a human. Keep them as sentences.
#[derive(Debug, Error)]
pub enum Error {
    /// ethui answered, but with a JSON-RPC error. Covers user rejection of an
    /// approval dialog.
    #[error("RPC error {code}: {message}")]
    Rpc { code: i64, message: String },

    /// No usable connection to the ethui app.
    #[error("ethui is not reachable — is the ethui app running?")]
    Disconnected,

    /// ethui accepted the request but never answered.
    #[error("request timed out")]
    Timeout,
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rpc_error_renders_code_and_message() {
        let err = Error::Rpc {
            code: -32603,
            message: "user rejected the request".into(),
        };

        assert_eq!(
            err.to_string(),
            "RPC error -32603: user rejected the request"
        );
    }

    #[test]
    fn disconnected_error_tells_the_user_to_check_the_app() {
        assert_eq!(
            Error::Disconnected.to_string(),
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[test]
    fn timeout_error_is_a_plain_sentence() {
        assert_eq!(Error::Timeout.to_string(), "request timed out");
    }
}
