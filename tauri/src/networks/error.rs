use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
pub enum Error {}

pub type Result<T> = std::result::Result<T, Error>;
