use std::{
    ffi::OsStr,
    path::{Path, PathBuf},
};

use glob::glob;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tokio::sync::mpsc::{self, Receiver};

pub(super) async fn async_watch<P: AsRef<Path>>(
    path: P,
    snd: mpsc::UnboundedSender<PathBuf>,
) -> notify::Result<()> {
    let (mut watcher, mut rx) = async_watcher()?;

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored for changes.
    watcher.watch(path.as_ref(), RecursiveMode::Recursive)?;

    while let Some(res) = rx.recv().await {
        use EventKind::*;

        match res {
            Ok(event) => match event.kind {
                Modify(_) | Remove(_) => {
                    if event.paths[0].extension() == Some(OsStr::new("json")) {
                        snd.send(event.paths[0].clone()).unwrap();
                    }
                }
                _ => {}
            },
            Err(e) => log::warn!("watch error: {:?}", e),
        }
    }

    Ok(())
}

fn async_watcher() -> notify::Result<(RecommendedWatcher, Receiver<notify::Result<Event>>)> {
    let (tx, rx) = mpsc::channel(100);

    let watcher = RecommendedWatcher::new(
        move |res| {
            futures::executor::block_on(async {
                tx.send(res).await.unwrap();
            });
        },
        Config::default(),
    )?;

    Ok((watcher, rx))
}

pub(super) async fn scan_glob<P: AsRef<Path>>(
    path: P,
    snd: mpsc::UnboundedSender<PathBuf>,
) -> notify::Result<()> {
    let query =
        format!("{}/**/*.sol/**/*.json", path.as_ref().to_str().unwrap()).replace("//", "/");

    for entry in glob(&query).unwrap().flatten() {
        snd.send(entry).unwrap();
    }

    // TODO: this should glob all files at the start
    Ok(())
}
