use clap::{Parser, Subcommand};

pub fn parse() -> Args {
    Args::parse()
}

#[derive(Parser, Debug)]
#[command(name = "ethui", author, version, about, long_about = None)]
pub struct Args {
    #[arg(long, default_value_t = false)]
    pub hidden: bool,

    #[arg(long, env = "ETHUI_CONFIG_DIR")]
    pub config_dir: Option<String>,

    #[arg(long, default_value_t = default_ws_port(), env = WS_PORT_ENV)]
    pub ws_port: u16,

    #[arg(long, default_value_t = default_stacks_port(), env = "ETHUI_STACKS_PORT")]
    pub stacks_port: u16,

    #[command(subcommand)]
    command: Option<Command>,
}

impl Args {
    pub fn command(&self) -> Command {
        self.command.clone().unwrap_or_default()
    }
}

#[derive(Subcommand, Clone, Debug, Default)]
pub enum Command {
    #[default]
    #[command(name = "app")]
    App,

    #[cfg(feature = "forge-traces")]
    Forge {
        #[command(subcommand)]
        cmd: Forge,
    },
}

#[derive(Subcommand, Debug, Clone)]
pub enum Forge {
    Test(ForgeTest),
}

#[derive(Parser, Debug, Clone, Default)]
pub struct ForgeTest {
    /// Additional arguments to pass to forge test
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    pub args: Vec<String>,
}

/// The environment variable that overrides the WS port.
///
/// Public for the same reason as [`default_ws_port`]: peers read the name from
/// here rather than repeating the literal.
pub const WS_PORT_ENV: &str = "ETHUI_WS_PORT";

/// The token a WS peer presents to be trusted as local.
///
/// Lives here rather than in `ethui-ws` because both sides need it and
/// `ethui-mcp` must not depend on the server it connects to.
pub mod token {
    use std::{io, path::PathBuf};

    /// Where the token lives, derived from the port and nothing else.
    ///
    /// Deliberately *not* the app's config dir: a peer cannot work out what
    /// that is (in debug builds it defaults to a path relative to the app's own
    /// working directory), which would force every MCP client to be configured
    /// by hand. The port is the one thing both sides already agree on — it is
    /// how the peer found the app at all — and two instances cannot share one,
    /// so it separates instances for free.
    pub fn path(port: u16) -> PathBuf {
        path_in(&dir(), port)
    }

    /// The directory holding every instance's token. Not the OS temp dir: on
    /// macOS a sandboxed app and a terminal-launched peer can be handed
    /// different `TMPDIR`s, and they would never find each other's file.
    fn dir() -> PathBuf {
        std::env::var_os("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join(".ethui")
    }

    fn path_in(dir: &std::path::Path, port: u16) -> PathBuf {
        dir.join(format!("ws-token-{port}"))
    }

    /// Reads the token, creating it if this is the first run.
    ///
    /// The file is written 0600: a web page cannot read the filesystem at all,
    /// so this only has to keep out other users of the machine.
    pub fn ensure(port: u16) -> io::Result<String> {
        ensure_in(&dir(), port)
    }

    fn ensure_in(dir: &std::path::Path, port: u16) -> io::Result<String> {
        let path = path_in(dir, port);

        if let Ok(existing) = std::fs::read_to_string(&path) {
            let existing = existing.trim().to_owned();
            if !existing.is_empty() {
                return Ok(existing);
            }
        }

        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let token = generate();
        std::fs::write(&path, &token)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))?;
        }

        Ok(token)
    }

    /// Reads the token without creating it. `None` when the app is not running
    /// or never wrote one, which must be treated as "trust nobody".
    pub fn read(port: u16) -> Option<String> {
        read_in(&dir(), port)
    }

    fn read_in(dir: &std::path::Path, port: u16) -> Option<String> {
        std::fs::read_to_string(path_in(dir, port))
            .ok()
            .map(|t| t.trim().to_owned())
            .filter(|t| !t.is_empty())
    }

    /// Compared in constant time so a peer cannot learn the token one byte at
    /// a time from how long the comparison takes.
    pub fn matches(expected: &str, presented: &str) -> bool {
        if expected.len() != presented.len() {
            return false;
        }

        expected
            .bytes()
            .zip(presented.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
    }

    fn generate() -> String {
        use std::hash::{BuildHasher as _, RandomState};

        // Two independently-seeded `RandomState`s, which draw from the OS
        // random source, rather than adding a crypto dependency for a value
        // that only has to be unguessable by other local processes.
        (0..4)
            .map(|_| {
                format!(
                    "{:016x}",
                    RandomState::new().hash_one(RandomState::new().hash_one(0u8))
                )
            })
            .collect()
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        /// A scratch directory, so the tests never touch the real `~/.ethui`.
        fn scratch(name: &str) -> PathBuf {
            let dir =
                std::env::temp_dir().join(format!("ethui-token-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&dir);
            dir
        }

        #[test]
        fn ensure_is_stable_across_calls() {
            let dir = scratch("stable");

            let first = ensure_in(&dir, 9102).unwrap();
            let second = ensure_in(&dir, 9102).unwrap();

            assert_eq!(first, second, "a second run must not invalidate peers");
            assert_eq!(read_in(&dir, 9102).as_deref(), Some(first.as_str()));

            std::fs::remove_dir_all(&dir).unwrap();
        }

        /// The port is what separates instances, so a dev app on 9102 must not
        /// hand its token to a peer looking for a release app on 9002.
        #[test]
        fn each_port_gets_its_own_token() {
            let dir = scratch("per-port");

            let dev = ensure_in(&dir, 9102).unwrap();
            let release = ensure_in(&dir, 9002).unwrap();

            assert_ne!(dev, release);
            assert_eq!(read_in(&dir, 9102).as_deref(), Some(dev.as_str()));

            std::fs::remove_dir_all(&dir).unwrap();
        }

        #[test]
        fn read_is_none_when_the_app_never_wrote_one() {
            let dir = scratch("missing");

            assert_eq!(read_in(&dir, 9102), None);
        }

        #[test]
        fn matches_rejects_a_wrong_or_truncated_token() {
            assert!(matches("abc123", "abc123"));
            assert!(!matches("abc123", "abc124"));
            assert!(!matches("abc123", "abc"));
            assert!(!matches("abc123", ""));
        }
    }
}

/// The WS port ethui listens on, per build profile.
///
/// Public so peers that connect to it — `ethui-mcp`, for one — resolve the same
/// port from the same definition rather than mirroring the literals.
pub const fn default_ws_port() -> u16 {
    if cfg!(debug_assertions) { 9102 } else { 9002 }
}

const fn default_stacks_port() -> u16 {
    if cfg!(debug_assertions) { 9110 } else { 9010 }
}
