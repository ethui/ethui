use std::path::Path;

use notify::{
    event::{CreateKind, ModifyKind, RemoveKind},
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Result, Watcher,
};
use tokio::sync::mpsc::{self, Receiver};

static PATH: &str = "/home/naps62/projects";

#[derive(Default)]
pub struct Foundry {
    // known_abis: HashMap<String, String>,
}

impl Foundry {
    pub async fn watch() -> Result<()> {
        // let (snd, rcv) = mpsc::unbounded_channel();

        tokio::spawn(async {
            if let Err(e) = async_watch("/home/naps62/projects/").await {
                println!("error: {:?}", e)
            }
        });

        // watcher.watch(Path::new("."), RecursiveMode::Recursive)?;

        Ok(())
    }
}

async fn async_watch<P: AsRef<Path>>(path: P) -> notify::Result<()> {
    let (mut watcher, mut rx) = async_watcher()?;

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored for changes.
    watcher.watch(path.as_ref(), RecursiveMode::Recursive)?;

    while let Some(res) = rx.recv().await {
        use EventKind::*;

        match res {
            Ok(event) => match event.kind {
                Modify(_) | Remove(_) => {
                    if event.paths[0].ends_with("run-latest.json") {
                        dbg!(event.kind, event.paths);
                    }
                }
                _ => {}
            },
            Err(e) => println!("watch error: {:?}", e),
        }
    }

    Ok(())
}

fn async_watcher() -> notify::Result<(RecommendedWatcher, Receiver<notify::Result<Event>>)> {
    let (tx, rx) = mpsc::channel(100);

    // Automatically select the best implementation for your platform.
    // You can also access each implementation directly e.g. INotifyWatcher.
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
