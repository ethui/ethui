use iron_types::events::Tx;
use iron_types::Address;
use sqlx::Row;

use crate::{Paginated, Pagination, Result, DB};

impl DB {
    pub async fn get_transactions(
        &self,
        chain_id: u32,
        from_or_to: Address,
        pagination: Pagination,
    ) -> Result<Paginated<Tx>> {
        let items: Vec<_> = sqlx::query(
            r#" SELECT *
            FROM transactions
            WHERE chain_id = ?
            AND (from_address = ? or to_address = ?) COLLATE NOCASE
            ORDER BY block_number DESC, position DESC
            LIMIT ? OFFSET ?"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .bind(pagination.page_size)
        .bind(pagination.offset())
        .map(|row| Tx::try_from(&row).unwrap())
        .fetch_all(self.pool())
        .await?;

        let total: u32 = sqlx::query(
            r#"
            SELECT COUNT(*) as total
            FROM transactions
            WHERE chain_id = ?
            AND (from_address = ? or to_address = ?) COLLATE NOCASE
            "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .map(|row| row.get("total"))
        .fetch_one(self.pool())
        .await?;

        Ok(Paginated::new(items, pagination, total))
    }
}
