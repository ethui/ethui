mod error;

pub use error::{TracingError, TracingResult};
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_subscriber::EnvFilter;

pub fn init() -> TracingResult<()> {
    let subscriber = tracing_subscriber::FmtSubscriber::builder()
        .with_env_filter(EnvFilter::from_default_env())
        .with_span_events(FmtSpan::NEW)
        .compact()
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    Ok(())
}
