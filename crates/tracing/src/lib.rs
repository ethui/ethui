use std::{
    fs::{File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use chrono::Utc;
use color_eyre::eyre::{Context as _, ContextCompat as _, eyre};
use once_cell::sync::OnceCell;
use tracing::info;
use tracing_subscriber::{
    EnvFilter, Layer, Registry,
    filter::{LevelFilter, Targets},
    fmt,
    fmt::writer::MakeWriter,
    layer::SubscriberExt as _,
    reload,
    util::SubscriberInitExt as _,
};

pub type TracingError = color_eyre::Report;

static RELOAD_HANDLE: OnceCell<reload::Handle<EnvFilter, Registry>> = OnceCell::new();
static WRITER_STATE: OnceCell<Arc<Mutex<WriterState>>> = OnceCell::new();
static LOG_PATH: OnceCell<PathBuf> = OnceCell::new();

/// Sets up the global tracing subscriber for stdout.
/// Initially, this reads RUST_LOG from env, but is later configured dinamically through a
/// RELOAD_HANDLE, via ethui settings > general
pub fn setup() -> color_eyre::Result<()> {
    let filter = EnvFilter::from_default_env();
    let (filter_layer, reload_handle) = reload::Layer::new(filter);

    let writer_state = Arc::new(Mutex::new(WriterState::Buffer(Vec::new())));

    let stdout_layer = fmt::Layer::default().with_ansi(true).without_time();

    let file_filter = Targets::new().with_target("ethui", LevelFilter::DEBUG);
    let file_layer = fmt::Layer::default()
        .with_ansi(true)
        .with_writer(LogWriterFactory::new(writer_state.clone()))
        .with_filter(file_filter);

    tracing_subscriber::registry()
        .with(filter_layer)
        .with(stdout_layer)
        .with(file_layer)
        .try_init()
        .wrap_err("failed to set global tracing subscriber")?;

    RELOAD_HANDLE
        .set(reload_handle)
        .map_err(|_| eyre!("stdout tracing layer already initialized"))?;
    WRITER_STATE
        .set(writer_state)
        .map_err(|_| eyre!("tracing writer already initialized"))?;

    Ok(())
}

/// Sets up file logging to the running configuration directory.
pub fn setup_file_logging<P: AsRef<Path>>(config_dir: P) -> color_eyre::Result<()> {
    let writer_state = WRITER_STATE
        .get()
        .with_context(|| "tracing setup must be called before init".to_string())?
        .clone();

    let dir = config_dir.as_ref();
    std::fs::create_dir_all(dir)
        .wrap_err_with(|| format!("failed to create logs directory {}", dir.display()))?;

    let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
    let session_path = dir.join(format!("session-{}.log", timestamp));

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&session_path)
        .with_context(|| format!("failed to open log file {}", session_path.display()))?;

    {
        let mut state = writer_state
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());

        match &mut *state {
            WriterState::Buffer(buffer) => {
                file.write_all(buffer)?;
                file.flush()?;
            }
            WriterState::File(existing) => {
                existing.flush()?;
            }
        }

        *state = WriterState::File(file);
    }

    let _ = LOG_PATH.set(session_path.clone());

    info!(path = %session_path.display(), "session log file opened");
    Ok(())
}

pub fn current_log_path() -> Option<PathBuf> {
    LOG_PATH.get().cloned()
}

pub fn parse(directives: &str) -> color_eyre::Result<EnvFilter> {
    Ok(EnvFilter::try_new(directives)?)
}

pub fn reload(directives: &str) -> color_eyre::Result<()> {
    let new_filter = parse(directives)?;

    let handle = RELOAD_HANDLE
        .get()
        .with_context(|| "Reload handle not set".to_string())?;

    handle.reload(new_filter)?;

    Ok(())
}

#[derive(Clone)]
struct LogWriterFactory {
    state: Arc<Mutex<WriterState>>,
}

impl LogWriterFactory {
    fn new(state: Arc<Mutex<WriterState>>) -> Self {
        Self { state }
    }
}

struct LogWriter {
    state: Arc<Mutex<WriterState>>,
}

impl<'a> MakeWriter<'a> for LogWriterFactory {
    type Writer = LogWriter;

    fn make_writer(&'a self) -> Self::Writer {
        LogWriter {
            state: self.state.clone(),
        }
    }
}

impl io::Write for LogWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());

        match &mut *state {
            WriterState::Buffer(buffer) => buffer.extend_from_slice(buf),
            WriterState::File(file) => {
                file.write_all(buf)?;
                file.flush()?;
            }
        }

        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());

        match &mut *state {
            WriterState::Buffer(_) => Ok(()),
            WriterState::File(file) => file.flush(),
        }
    }
}

enum WriterState {
    Buffer(Vec<u8>),
    File(File),
}
