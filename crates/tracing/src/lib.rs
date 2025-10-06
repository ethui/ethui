use color_eyre::eyre::ContextCompat as _;
use once_cell::sync::OnceCell;
use tracing_subscriber::{
    EnvFilter, Registry, fmt, layer::SubscriberExt as _, reload, util::SubscriberInitExt as _,
};

static RELOAD_HANDLE: OnceCell<reload::Handle<EnvFilter, Registry>> = OnceCell::new();

pub fn init() -> color_eyre::Result<()> {
    let filter = EnvFilter::from_default_env();
    let (filter, reload_handle) = reload::Layer::new(filter);
    RELOAD_HANDLE.set(reload_handle).unwrap();

    let fmt = fmt::Layer::default().with_ansi(true).without_time();
    tracing_subscriber::registry().with(filter).with(fmt).init();

    Ok(())
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
