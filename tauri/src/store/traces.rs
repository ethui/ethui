use async_trait::async_trait;
use ethers::types::{Action, Address, Bytes, Call, Create, CreateResult, Res, Trace, H256, U256};
use sqlx::Row;

use crate::{db::DB, error::Result};

#[derive(Debug)]
pub enum Event {
    Tx(Tx),
    ContractDeployed(ContractDeployed),
    ERC20Transfer(ERC20Transfer),
}

#[derive(Debug)]
pub struct Events(pub Vec<Event>);

#[derive(Debug)]
pub struct Tx {
    pub hash: H256,
    pub from: Address,
    pub to: Option<Address>,
    pub value: U256,
    pub data: Bytes,
}

#[derive(Debug)]
pub struct ERC20Transfer {
    pub from: Address,
    pub to: Address,
    pub token: Address,
    pub amount: U256,
}

#[derive(Debug)]
pub struct ContractDeployed {
    pub address: Address,
}

impl From<Trace> for Events {
    fn from(trace: Trace) -> Self {
        let events: Vec<Event> = match (trace.action, trace.result, trace.trace_address.len()) {
            // contract deploys
            (
                Action::Create(Create { from, value, .. }),
                Some(Res::Create(CreateResult { address, .. })),
                _,
            ) => {
                vec![
                    Tx {
                        hash: trace.transaction_hash.unwrap(),
                        from,
                        to: None,
                        value,
                        data: Bytes::new(),
                    }
                    .into(),
                    ContractDeployed::new(address).into(),
                ]
            }

            // top-level trace of a transaction
            (action, _, 0) => match action {
                // TODO: match call input against ERC20 abi

                // other regular calls
                Action::Call(Call {
                    from,
                    to,
                    value,
                    input,
                    ..
                }) => vec![Tx {
                    hash: trace.transaction_hash.unwrap(),
                    from,
                    to: Some(to),
                    value,
                    data: input,
                }
                .into()],

                // we already capture contract deploys somewhere else
                _ => vec![],
            },

            _ => vec![],
        };

        Events(events)
    }
}

impl From<Vec<Trace>> for Events {
    fn from(traces: Vec<Trace>) -> Self {
        let events: Vec<Vec<Event>> = traces
            .into_iter()
            .map(|t| Into::<Events>::into(t).0)
            .collect();

        let result: Vec<Event> = events.into_iter().flatten().collect();
        Events(result)
    }
}

#[async_trait]
pub trait TracesStore {
    async fn save_traces<T: Into<Events> + Sized + Send>(
        &self,
        chain_id: u32,
        events: T,
    ) -> Result<()>;

    async fn truncate_traces(&self, chain_id: u32) -> Result<()>;

    // TODO: should maybe return Vec<H256> here
    async fn get_transactions(&self, chain_id: u32, from_or_to: Address) -> Result<Vec<String>>;

    // TODO: should maybe return Vec<H256> here
    async fn get_contracts(&self, chain_id: u32) -> Result<Vec<String>>;
}

#[async_trait]
impl TracesStore for DB {
    async fn save_traces<T: Into<Events> + Sized + Send>(
        &self,
        chain_id: u32,
        events: T,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        for tx in events.into().0.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(ref tx) => {
                    dbg!(format!("0x{:x}", tx.from));
                    sqlx::query(
                        r#" INSERT INTO transactions (hash, chain_id, from_address, to_address)
                    VALUES (?,?,?,?)
                    ON CONFLICT(hash) DO NOTHING "#,
                    )
                    .bind(format!("0x{:x}", tx.hash))
                    .bind(chain_id)
                    .bind(format!("0x{:x}", tx.from))
                    .bind(tx.to.map(|a| format!("0x{:x}", a)))
                    .execute(&mut conn)
                    .await?;
                }

                Event::ContractDeployed(ref tx) => {
                    sqlx::query(
                        r#" INSERT INTO contracts (address, chain_id)
                    VALUES (?,?)
                    ON CONFLICT(address, chain_id) DO NOTHING "#,
                    )
                    .bind(format!("0x{:x}", tx.address))
                    .bind(chain_id)
                    .execute(&mut conn)
                    .await?;
                }
                _ => {}
            }
        }
        conn.commit().await?;
        Ok(())
    }

    async fn get_transactions(&self, chain_id: u32, from_or_to: Address) -> Result<Vec<String>> {
        let res: Vec<String> = sqlx::query(
            r#" SELECT * 
            FROM transactions 
            WHERE chain_id = ? 
            AND (from_address = ? or to_address = ?) COLLATE NOCASE "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .map(|row| row.get("hash"))
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    async fn get_contracts(&self, chain_id: u32) -> Result<Vec<String>> {
        let res: Vec<String> = sqlx::query(
            r#" SELECT * 
            FROM contracts
            WHERE chain_id = ? "#,
        )
        .bind(chain_id)
        .map(|row| row.get("address"))
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    async fn truncate_traces(&self, chain_id: u32) -> Result<()> {
        sqlx::query("DELETE FROM transactions WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query("DELETE FROM contracts WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        Ok(())
    }
}

impl ContractDeployed {
    pub fn new(address: Address) -> Self {
        Self { address }
    }
}

impl From<ContractDeployed> for Event {
    fn from(value: ContractDeployed) -> Self {
        Self::ContractDeployed(value)
    }
}

impl From<Tx> for Event {
    fn from(value: Tx) -> Self {
        Self::Tx(value)
    }
}
