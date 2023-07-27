use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("feed provider {0} not supported")]
    UnsupportedFeedProvider(String),
}
