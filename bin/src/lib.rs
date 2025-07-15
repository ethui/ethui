// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod menu;
mod system_tray;
mod windows;

use color_eyre::Result;
use ethui_args::Command;

#[tokio::main]
pub async fn run() -> Result<()> {
    ethui_tracing::init()?;
    fix_path_env::fix()?;

    let args = ethui_args::parse();

    match args.command() {
        Command::App { .. } => app::EthUIApp::start_or_open(args).await?,

        #[cfg(feature = "forge-traces")]
        Command::Forge { subcommand } => {
            ethui_forge_traces::handle_forge_command(&subcommand, &args).await?
        }
    }

    Ok(())
}
