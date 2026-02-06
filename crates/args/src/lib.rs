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

    #[arg(long, default_value_t = default_ws_port(), env = "ETHUI_WS_PORT")]
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

const fn default_ws_port() -> u16 {
    if cfg!(debug_assertions) { 9102 } else { 9002 }
}

const fn default_stacks_port() -> u16 {
    if cfg!(debug_assertions) { 9110 } else { 9010 }
}
