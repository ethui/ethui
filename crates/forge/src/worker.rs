use once_cell::sync::Lazy;
use regex::Regex;
use std::{ffi::OsStr, path::PathBuf};

use notify::EventKind;
use notify_debouncer_full::DebouncedEvent;
use tokio::sync::mpsc::UnboundedReceiver;

pub(crate) struct Worker {
    rcv: UnboundedReceiver<Vec<DebouncedEvent>>,
}

impl Worker {
    pub fn new(rcv: UnboundedReceiver<Vec<DebouncedEvent>>) -> Self {
        Self { rcv }
    }

    pub async fn run(mut self) {
        while let Some(events) = self.rcv.recv().await {
            let matches: Vec<Match> = events
                .into_iter()
                .filter_map(|event| event.event.try_into().ok())
                .collect();

            dbg!(&matches);

            // convert event to a match, notify if successful
            //if let Ok(m) = event.try_into() {
            //    snd.send(m).unwrap();
            //}
        }
    }
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

#[derive(Debug, Clone)]
pub struct Match {
    pub full_path: PathBuf,
    pub project: String,
    pub file: String,
    pub name: String,
}

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
            Create(_) | Modify(_) => event.paths[0].clone().try_into(),
            _ => Err(()),
        }
    }
}
