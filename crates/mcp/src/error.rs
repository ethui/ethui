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

    /// ethui answered, but not in the shape the tool expected. `detail` is
    /// phrased to complete the sentence "ethui returned …".
    #[error("ethui returned {detail}")]
    Malformed { detail: String },

    /// The agent asked for something ethui cannot do. `message` is the whole
    /// sentence, because each caller explains its own refusal differently.
    #[error("{message}")]
    Unsupported { message: String },
}

impl Error {
    pub fn malformed(detail: impl Into<String>) -> Self {
        Self::Malformed {
            detail: detail.into(),
        }
    }

    pub fn unsupported(message: impl Into<String>) -> Self {
        Self::Unsupported {
            message: message.into(),
        }
    }
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

    #[test]
    fn malformed_error_quotes_what_ethui_actually_returned() {
        assert_eq!(
            Error::malformed("an unparseable chain id: banana").to_string(),
            "ethui returned an unparseable chain id: banana"
        );
    }

    #[test]
    fn unsupported_error_is_its_own_whole_sentence() {
        assert_eq!(
            Error::unsupported("eth_foo is not served by this ethui build.").to_string(),
            "eth_foo is not served by this ethui build."
        );
    }
}
