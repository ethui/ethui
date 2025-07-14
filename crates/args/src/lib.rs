use clap::{Parser, Subcommand};

pub fn parse() -> Args {
    Args::parse()
}

#[derive(Parser, Debug)]
#[command(name = "ethui", author, version, about, long_about = None)]
pub struct Args {
    #[arg(long, env = "ETHUI_CONFIG_DIR")]
    pub config_dir: Option<String>,

    #[arg(long, default_value_t = 9002, env = "ETHUI_WS_PORT")]
    pub ws_port: u16,

    #[arg(long, default_value_t = 9010, env = "ETHUI_STACKS_PORT")]
    pub stacks_port: u16,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    #[command(name = "app")]
    App {
        #[arg(long, default_value_t = false)]
        hidden: bool,
    },

    #[cfg(feature = "forge-traces")]
    /// Run forge tests
    #[command(name = "forge")]
    Forge {
        #[command(subcommand)]
        subcommand: ForgeCommands,
    },
}

#[derive(Subcommand, Debug)]
pub enum ForgeCommands {
    /// Run tests
    Test {
        /// Additional arguments to pass to forge test
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        args: Vec<String>,
    },
}
