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
        }
    }
}

#[derive(Debug, Clone)]
pub struct Match {
    pub path: PathBuf,
    pub project: String,
    pub file: String,
    pub name: String,
}

impl TryFrom<PathBuf> for Match {
    type Error = ();

    fn try_from(path: PathBuf) -> std::result::Result<Self, Self::Error> {
        use std::path::Component;

        // ignore non-json files
        if path.extension().is_none_or(|p| p != "json") {
            return Err(());
        }

        let mut components = path.components().rev();

        // fetch contract name (without .json extension)
        let name: String = match components.next() {
            Some(Component::Normal(name)) => os_str_to_string(name)?
                .strip_suffix(".json")
                .map(|p| p.to_string())
                .ok_or(())?,
            _ => return Err(()),
        };

        // parent is solidity file name
        let file = match components.next() {
            Some(Component::Normal(file)) => os_str_to_string(file)?,
            _ => return Err(()),
        };

        // grandparent is the out dir itself
        let _out = components.next();

        // grand-grandparent is the project name
        let project = match components.next() {
            Some(Component::Normal(file)) => os_str_to_string(file)?,
            _ => return Err(()),
        };

        Ok(Self {
            path,
            project,
            file,
            name,
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

fn os_str_to_string(s: &OsStr) -> std::result::Result<String, ()> {
    Ok(s.to_str().ok_or(())?.to_string())
}
