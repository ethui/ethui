use clap::Parser;

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

    #[arg(long, default_value_t = false)]
    pub hidden: bool,
}
