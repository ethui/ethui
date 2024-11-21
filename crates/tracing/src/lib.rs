mod error;

pub use error::{TracingError, TracingResult};
use tracing_subscriber::{
    filter,
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt as _,
    reload,
    util::SubscriberInitExt as _,
    EnvFilter,
};

pub fn init() -> TracingResult<()> {
    let filter = filter::LevelFilter::WARN;
    let (filter, reload_handle) = reload::Layer::new(filter);

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt::Layer::default())
        .init();

    tracing::info!("This will be ignored");
    let _ = reload_handle.modify(|filter| *filter = filter::LevelFilter::INFO);
    tracing::info!("This will be logged");

    Ok(())
}

//pub fn reload() -> TracingResult<()> {
//    let filter = Level::WARN;
//    let (filter, reload_handle) = reload::Layer::new(filter);
//    tracing_subscriber::registry()
//        .with(filter)
//        .with(fmt::Layer::default().init());
//    Ok(())
//}
