// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod menu;
mod system_tray;
mod windows;

use color_eyre::Result;
#[cfg(feature = "forge-traces")]
use ethui_args::{Commands, ForgeCommands};
#[cfg(feature = "forge-traces")]
use ethui_forge_traces::ForgeTestRunner;
use named_lock::NamedLock;

#[cfg(not(debug_assertions))]
static LOCK_NAME: &str = "iron-wallet";
#[cfg(debug_assertions)]
static LOCK_NAME: &str = "iron-wallet-dev";

#[tokio::main]
pub async fn run() -> Result<()> {
    ethui_tracing::init()?;
    fix_path_env::fix()?;

    let args = ethui_args::parse();

    #[cfg(feature = "forge-traces")]
    if let Some(command) = &args.command {
        return handle_command(command, &args).await;
    }

    let lock = NamedLock::create(LOCK_NAME)?;

    let _guard = match lock.try_lock() {
        Ok(g) => g,
        Err(_) => {
            ethui_broadcast::main_window_show().await;
            return Ok(());
        }
    };

    app::EthUIApp::build(&args).await?.run();

    Ok(())
}

#[cfg(feature = "forge-traces")]
async fn handle_command(command: &Commands, args: &ethui_args::Args) -> Result<()> {
    match command {
        Commands::Forge { subcommand } => handle_forge_command(subcommand, args).await,
    }
}

#[cfg(feature = "forge-traces")]
async fn handle_forge_command(subcommand: &ForgeCommands, args: &ethui_args::Args) -> Result<()> {
    use std::env;

    match subcommand {
        ForgeCommands::Test => {
            let current_dir = env::current_dir().expect("failed to get current dir");
            let forge_test_runner =
                ForgeTestRunner::new(current_dir.to_string_lossy().to_string(), args.ws_port);
            forge_test_runner.run_tests().await
        }
    }
}
