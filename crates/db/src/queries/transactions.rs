use std::str::FromStr;

use iron_types::events::Tx;
use iron_types::{Address, Bytes, B256, U256};
use sqlx::Row;
use tracing::instrument;

use crate::{Paginated, Pagination, Result, DB};

impl DB {
    #[instrument(level = "trace", skip(self))]
    pub async fn insert_transaction(&self, chain_id: u32, tx: &Tx) -> Result<()> {
        let hash = format!("0x{:x}", tx.hash);
        let from = format!("0x{:x}", tx.from);
        let to = tx.to.map(|a| format!("0x{:x}", a));
        let block_number = tx.block_number as i64;
        let position = tx.position.unwrap_or(0) as u32;
        let value = tx.value.to_string();
        let status = tx.status as u32;

        sqlx::query!(
            r#" INSERT INTO transactions (hash, chain_id, from_address, to_address, block_number, position, value, status)
            VALUES (?,?,?,?,?,?,?,?)
            ON CONFLICT(hash) DO NOTHING "#,
            hash,
            chain_id,
            from,
            to,
            block_number,
            position,
            value,
            status
        )
        .execute(self.pool()).await?;

        Ok(())
    }

    pub async fn get_transactions(
        &self,
        chain_id: u32,
        from_or_to: Address,
        pagination: Pagination,
    ) -> Result<Paginated<Tx>> {
        let from_or_to = from_or_to.to_string();
        let offset = pagination.offset();

        let rows = sqlx::query!(
            r#" SELECT *
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
            .map(|r| Tx {
                hash: B256::from_str(&r.hash.unwrap()).unwrap(),
                from: Address::from_str(&r.from_address).unwrap(),
                to: Address::from_str(&r.to_address.unwrap()).ok(),
                value: U256::from_str_radix(&r.value, 10).unwrap(),
                data: Bytes::from_str(&r.data).unwrap(),
                block_number: r.block_number as u64,
                position: Some(r.position as usize),
                status: r.status.unwrap_or_default() as u64,
                deployed_contract: None,
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
