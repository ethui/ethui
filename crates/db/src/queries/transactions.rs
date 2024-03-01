use std::str::FromStr;

use iron_types::events::Tx;
use iron_types::transactions::PaginatedTx;
use iron_types::{Address, Bytes, B256, U256};
use tracing::instrument;

use crate::{Db, Paginated, Pagination, Result};

impl Db {
    #[instrument(level = "trace", skip(self))]
    pub async fn insert_transactions(&self, chain_id: u32, txs: Vec<Tx>) -> Result<()> {
        for tx in txs.iter() {
            self.insert_transaction(chain_id, tx).await?;
        }
        Ok(())
    }

    #[instrument(level = "trace", skip(self))]
    pub async fn insert_transaction(&self, chain_id: u32, tx: &Tx) -> Result<()> {
        let hash = format!("0x{:x}", tx.hash);
        let from = format!("0x{:x}", tx.from);
        let to = tx.to.map(|a| format!("0x{:x}", a));
        let block_number = tx.block_number.map(|b| b as i64);
        let position = tx.position.unwrap_or(0) as u32;
        let value = tx.value.map(|v| v.to_string());
        let status = tx.status as u32;
        let incomplete = tx.incomplete;

        sqlx::query!(
            r#" INSERT OR REPLACE INTO transactions (hash, chain_id, from_address, to_address, block_number, position, value, status, incomplete)
            VALUES (?,?,?,?,?,?,?,?,?)"#,
            hash,
            chain_id,
            from,
            to,
            block_number,
            position,
            value,
            status,
            incomplete
        )
        .execute(self.pool()).await?;

        Ok(())
    }

    pub async fn get_transaction_by_hash(&self, chain_id: u32, hash: B256) -> Result<Tx> {
        let hash = hash.to_string();

        let row = sqlx::query!(
            r#" SELECT hash, from_address, to_address, data as 'data?', value as 'value?', block_number, position, status, incomplete as 'incomplete!'
                FROM transactions
                WHERE chain_id = ? AND hash = ? "#,
            chain_id,
            hash
        )
        .fetch_one(self.pool())
        .await?;

        let tx = Tx {
            hash: B256::from_str(&row.hash.unwrap()).unwrap(),
            from: Address::from_str(&row.from_address).unwrap(),
            to: row.to_address.and_then(|v| Address::from_str(&v).ok()),
            value: row.value.map(|v| U256::from_str_radix(&v, 10).unwrap()),
            data: row.data.map(|data| Bytes::from_str(&data).unwrap()),
            block_number: row.block_number.map(|b| b as u64),
            position: row.position.map(|p| p as usize),
            status: row.status.unwrap_or_default() as u64,
            incomplete: row.incomplete,
            deployed_contract: None,
        };

        Ok(tx)
    }

    pub async fn get_transactions(
        &self,
        chain_id: u32,
        from_or_to: Address,
        pagination: Pagination,
    ) -> Result<Paginated<PaginatedTx>> {
        let from_or_to = from_or_to.to_string();
        let offset = pagination.offset();

        let rows = sqlx::query!(
            r#" SELECT value as 'value?', hash, from_address, to_address, block_number, status, incomplete as 'incomplete!'
                FROM transactions
                WHERE chain_id = ?
                AND (from_address = ? or to_address = ?) COLLATE NOCASE
                ORDER BY block_number DESC, position DESC
                LIMIT ? OFFSET ?"#,
            chain_id,
            from_or_to,
            from_or_to,
            pagination.page_size,
            offset
        )
        .fetch_all(self.pool())
        .await?;

        let items = rows
            .into_iter()
            .map(|r| PaginatedTx {
                hash: B256::from_str(&r.hash.unwrap()).unwrap(),
                from: Address::from_str(&r.from_address).unwrap(),
                to: r.to_address.and_then(|r| Address::from_str(&r).ok()),
                status: r.status.unwrap_or_default() as u64,
                incomplete: r.incomplete,
            })
            .collect();

        let total_row = sqlx::query!(
            r#"
            SELECT COUNT(*) as total
                FROM transactions
                WHERE chain_id = ?
                AND (from_address = ? or to_address = ?) COLLATE NOCASE
            "#,
            chain_id,
            from_or_to,
            from_or_to
        )
        .fetch_one(self.pool())
        .await?;

        Ok(Paginated::new(items, pagination, total_row.total as u32))
    }
}
