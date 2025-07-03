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
        Command::App => app::EthUIApp::start_or_open(args).await?,

        #[cfg(feature = "forge-traces")]
        Command::Forge { cmd } => ethui_forge_traces::handle_forge_command(&cmd, &args).await?,
    }

    Ok(())
}

async fn handle_command(command: &Commands, args: &ethui_args::Args) -> Result<()> {
    match command {
        Commands::App { hidden: _ } => {
            let lock = NamedLock::create(LOCK_NAME)?;

            let _guard = match lock.try_lock() {
                Ok(g) => g,
                Err(_) => {
                    ethui_broadcast::main_window_show().await;
                    return Ok(());
                }
            };
            app::EthUIApp::build(args).await?.run();
            Ok(())
        }

        #[cfg(feature = "forge-traces")]
        Commands::Forge { subcommand } => {
            ethui_forge_traces::handle_forge_command(subcommand, args).await
        }
    }
}
