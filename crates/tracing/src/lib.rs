mod error;

pub use error::{TracingError, TracingResult};
use once_cell::sync::OnceCell;
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt as _,
    reload,
    util::SubscriberInitExt as _,
    EnvFilter, Registry,
};

static RELOAD_HANDLE: OnceCell<reload::Handle<EnvFilter, Registry>> = OnceCell::new();

pub fn init() -> TracingResult<()> {
    let filter = EnvFilter::from_default_env();
    let (filter, reload_handle) = reload::Layer::new(filter);
    RELOAD_HANDLE.set(reload_handle).unwrap();

    let fmt = fmt::Layer::default()
        .with_ansi(true)
        .with_span_events(FmtSpan::ACTIVE);
    tracing_subscriber::registry().with(filter).with(fmt).init();

    Ok(())
}

pub fn parse(directives: &str) -> TracingResult<EnvFilter> {
    Ok(EnvFilter::try_new(directives)?)
}

pub fn reload(directives: &str) -> TracingResult<()> {
    let new_filter = parse(directives)?;

    RELOAD_HANDLE
        .get()
        .ok_or(TracingError::ReloadHandleNotSet)?
        .modify(|filter| *filter = new_filter)?;

    Ok(())
}
