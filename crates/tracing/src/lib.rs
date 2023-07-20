mod error;

pub use error::{TracingError, TracingResult};
use tracing::Level;

pub fn init() -> TracingResult<()> {
    let subscriber = tracing_subscriber::FmtSubscriber::builder()
        .with_max_level(Level::TRACE)
        .compact()
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    Ok(())
}
