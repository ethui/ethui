use std::{
    ffi::OsStr,
    path::{Path, PathBuf},
};

use glob::glob;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use once_cell::sync::Lazy;
use regex::Regex;
use tokio::sync::mpsc::{self, Receiver};

/// An abi match contains the full path of the matched file, as well as parsed information about it
#[derive(Debug, Clone)]
pub(super) struct Match {
    pub(super) full_path: PathBuf,
    pub(super) project: String,
    pub(super) file: String,
    pub(super) name: String,
}

pub enum WatcherMsg {
    Start(PathBuf),
    Stop(PathBuf),
}

/// Creates an async watch, looking for relevant ABI files to index
/// Starts with no directories, and receives start/stop events for each individual directory to
/// watch/unwatch
pub(super) async fn async_watch(
    snd: mpsc::UnboundedSender<Match>,
    mut rcv: mpsc::UnboundedReceiver<WatcherMsg>,
) -> notify::Result<()> {
    let (mut watcher, mut rx) = async_watcher()?;

    loop {
        tokio::select! {
            Some(msg) = rcv.recv() => {
                let res = match msg {
                    WatcherMsg::Start(path) => watcher.watch(&path, RecursiveMode::Recursive),
                    WatcherMsg::Stop(path) => watcher.unwatch(&path),
                };

                match res {
                    Ok(_) => {},
                    Err(e)=>{
                        tracing::warn!("watch error: {:?}", e)
                    }
                }
            }

            msg = rx.recv() => {
                match msg {
                    Some(Ok(event)) => {
                        // convert event to a match, notify if successful
                        if let Ok(m) = event.try_into() {
                            snd.send(m).unwrap();
                        }
                    }

                    Some(Err(e)) => {
                        tracing::warn!("watch error: {:?}", e)
                    }

                    _ => {}
                }
            }
        }
    }
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

/// Runs a one-off glob query looking for ABIs to index
/// Is meant to complement `async_watch` by running an initial sweep on boot
pub(super) async fn scan_glob<P: AsRef<Path>>(
    path: P,
    snd: mpsc::UnboundedSender<Match>,
) -> notify::Result<()> {
    let query =
        format!("{}/**/*.sol/**/*.json", path.as_ref().to_str().unwrap()).replace("//", "/");

    for entry in glob(&query)
        .unwrap()
        .flatten()
        .flat_map(|path| path.try_into())
    {
        snd.send(entry).unwrap();
    }

    // TODO: this should glob all files at the start
    Ok(())
}

/// A regex that matches paths in the form
/// `.../{project_name}/out/{dir/subdir}/{abi}.json`
#[cfg(not(target_os = "windows"))]
static REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"(?x)
        /
        (?P<project>[^/]+) # project name
        /out/
        (?P<file>.+) # file path
        /
        (?P<name>[^/]+) # abi name
        .json 
        $"#,
    )
    .unwrap()
});

#[cfg(target_os = "windows")]
static REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"(?x)
        \\
        (?P<project>[^\\]+) # project name
        \\out\\
        (?P<file>.+) # file path
        \\
        (?P<name>[^\\]+) # abi name
        .json 
        $"#,
    )
    .unwrap()
});

impl TryFrom<PathBuf> for Match {
    type Error = ();

    fn try_from(path: PathBuf) -> std::result::Result<Self, Self::Error> {
        if path.extension() != Some(OsStr::new("json")) {
            return Err(());
        }

        let path_str = path.clone();
        let path_str = path_str.to_str().unwrap();

        REGEX.captures(path_str).ok_or(()).map(|caps| Self {
            full_path: path,
            project: caps["project"].to_string(),
            file: caps["file"].to_string(),
            name: caps["name"].to_string(),
        })
    }
}

impl TryFrom<notify::Event> for Match {
    type Error = ();

    fn try_from(event: notify::Event) -> Result<Self, Self::Error> {
        use EventKind::*;
        match event.kind {
            Modify(_) | Remove(_) => event.paths[0].clone().try_into(),
            _ => Err(()),
        }
    }
}
