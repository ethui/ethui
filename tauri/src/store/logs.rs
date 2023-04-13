use async_trait::async_trait;
use ethers::types::{Action, Address, Bytes, Call, Create, CreateResult, Res, Trace, H256, U256};
use sqlx::Row;

use crate::{db::DB, error::Result};

impl From<Log> for Events {
    fn from(trace: Trace) -> Self {
        todo!()
    }
}

impl From<Vec<Log>> for Events {
    fn from(traces: Vec<Trace>) -> Self {
        todo!()
    }
}

#[async_trait]
pub trait LogsStore {
    async fn save_logs<T: Into<Events> + Sized + Send>(
        &self,
        chain_id: u32,
        events: T,
    ) -> Result<()>;

    async fn truncate_logs(&self, chain_id: u32) -> Result<()>;
}

#[async_trait]
impl TracesStore for DB {
    async fn save_logs<T: Into<Log> + Sized + Send>(&self, chain_id: u32, logs: T) -> Result<()> {
        todo!()
    }

    async fn truncate_logs(&self, chain_id: u32) -> Result<()> {
        todo!()
    }
}
