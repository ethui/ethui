// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod menu;
mod system_tray;
mod windows;

#[cfg(all(feature = "updater", any(debug_assertions, target_os = "macos")))]
mod updater;

use color_eyre::Result;
use args::Command;

#[tokio::main]
pub async fn run() -> Result<()> {
    tracing_utils::setup()?;
    fix_path_env::fix()?;

    let args = args::parse();

    match args.command() {
        Command::App => app::EthUIApp::start_or_open(args).await?,

        #[cfg(feature = "forge-traces")]
        Command::Forge { cmd } => forge_traces::handle_forge_command(&cmd, &args).await?,
    }

    Ok(())
}
