//! Tauri auto updates. Currently only available on macOS.

use std::time::Duration;

use ethui_types::UINotify;
use tauri_plugin_updater::UpdaterExt as _;
use tokio::time::interval;
use tracing::{info, instrument};

pub(crate) fn spawn(handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = interval(Duration::from_secs(60 * 60));

        loop {
            interval.tick().await;
            let _ = update(&handle).await;
        }
    });
}

#[instrument(level = "info", skip_all)]
async fn update(handle: &tauri::AppHandle) -> color_eyre::Result<()> {
    if let Some(update) = handle.updater()?.check().await? {
        let mut downloaded = 0;
        let mut percent = 0.;
        let mut last_percent = -0.1;

        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(length) = content_length {
                        percent = downloaded as f64 / length as f64;
                        if percent > last_percent {
                            info!(
                                percent = format!("{:.0}%", percent * 100.),
                                mbs = downloaded / 1024 / 1024,
                            );
                            last_percent += 0.1;
                        }
                    }
                },
                || info!(percent = 100.),
            )
            .await?;

        ethui_broadcast::ui_notify(UINotify::UpdateReady {
            version: update.version,
        })
        .await;
    }

    Ok(())
}
