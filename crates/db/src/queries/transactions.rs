use std::str::FromStr;

use ethui_types::{events::Tx, prelude::*, transactions::Transaction};

use crate::{DbInner, pagination::TxIdx};

impl DbInner {
    pub async fn insert_transactions(&self, chain_id: u64, txs: Vec<Tx>) -> Result<()> {
        for tx in txs.iter() {
            self.insert_transaction(chain_id, tx).await?;
        }
        Ok(())
    }

    pub async fn insert_transaction(&self, chain_id: u64, tx: &Tx) -> Result<()> {
        let hash = format!("0x{:x}", tx.hash);
        let trace_address = tx.trace_address.clone().map(|t| {
            t.into_iter()
                .map(|i| i.to_string())
                .collect::<Vec<_>>()
                .join("/")
        });
        let chain_id = chain_id as i64;
        let from = format!("0x{:x}", tx.from);
        let to = tx.to.map(|a| format!("0x{a:x}"));
        let block_number = tx.block_number.map(|b| b as i64);
        let position = tx.position.unwrap_or(0) as u32;
        let value = tx.value.map(|v| v.to_string());
        let data = tx.data.clone().map(|d| d.to_string());
        let status = tx.status as u32;
        let incomplete = tx.incomplete;
        let gas_limit = tx.gas_limit.map(|v| v.to_string());
        let gas_used = tx.gas_used.map(|v| v.to_string());
        let max_fee_per_gas = tx.max_fee_per_gas.map(|v| v.to_string());
        let max_priority_fee_per_gas = tx.max_priority_fee_per_gas.map(|v| v.to_string());
        let r#type = tx.r#type.map(|t| t as i64);
        let nonce = tx.nonce.map(|n| n as i64);

        sqlx::query!(
            r#" INSERT OR IGNORE INTO transactions (hash, chain_id, trace_address, from_address, to_address, block_number, position, value, data, gas_limit, gas_used, max_fee_per_gas, max_priority_fee_per_gas, type, nonce, status, incomplete)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"#,
            hash,
            chain_id,
            trace_address,
            from,
            to,
            block_number,
            position,
            value,
            data,
            gas_limit,
            gas_used,
            max_fee_per_gas,
            max_priority_fee_per_gas,
            r#type,
            nonce,
            status,
            incomplete
        )
        .execute(self.pool()).await?;

        Ok(())
    }

    pub async fn get_transaction_by_hash(
        &self,
        chain_id: u64,
        hash: B256,
    ) -> color_eyre::Result<Tx> {
        let hash = hash.to_string();
        let chain_id = chain_id as i64;

        let row = sqlx::query!(
            r#" SELECT hash, trace_address, from_address, to_address, data as 'data?', value as 'value?', block_number, position, gas_limit, gas_used, max_fee_per_gas, max_priority_fee_per_gas, type, nonce, status, incomplete as 'incomplete!'
                FROM transactions
                WHERE chain_id = ? AND hash = ? "#,
            chain_id,
            hash
        )
        .fetch_one(self.pool())
        .await?;

        let trace_address: Option<Vec<usize>> = match row.trace_address {
            None => None,
            Some(ref t) if t.is_empty() => None,
            Some(ref t) => Some(t.split('/').map(|v: &str| v.parse().unwrap()).collect()),
        };

        let tx = Tx {
            hash: B256::from_str(&row.hash.unwrap()).unwrap(),
            trace_address,
            from: Address::from_str(&row.from_address).unwrap(),
            to: row
                .to_address
                .as_deref()
                .and_then(|v| Address::from_str(v).ok()),
            value: row
                .value
                .as_deref()
                .map(|v| U256::from_str_radix(v, 10).unwrap()),
            data: row
                .data
                .as_deref()
                .map(|data| Bytes::from_str(data).unwrap()),
            block_number: row.block_number.map(|b| b as u64),
            position: row.position.map(|p| p as usize),
            status: row.status.unwrap_or_default() as u64,
            gas_limit: row.gas_limit.as_deref().map(|v: &str| v.parse().unwrap()),
            gas_used: row.gas_used.as_deref().map(|v: &str| v.parse().unwrap()),
            max_fee_per_gas: row
                .max_fee_per_gas
                .as_deref()
                .map(|v: &str| v.parse().unwrap()),
            max_priority_fee_per_gas: row
                .max_priority_fee_per_gas
                .as_deref()
                .map(|v: &str| v.parse().unwrap()),
            r#type: row.r#type.map(|t| t as u64),
            nonce: row.nonce.map(|n| n as u64),
            incomplete: row.incomplete,
            deployed_contract: None,
        };

        Ok(tx)
    }

    pub async fn get_newer_transactions(
        &self,
        chain_id: u64,
        from_or_to: Address,
        max: u32,
        first_known: Option<TxIdx>,
    ) -> Result<Vec<Transaction>> {
        let from_or_to = from_or_to.to_string();
        let first_known = first_known.unwrap_or_default();
        let first_known_block = first_known.block_number as i64;
        let first_known_position = first_known.position as i64;
        let chain_id = chain_id as i64;

        let rows = sqlx::query!(
            r#" SELECT * FROM (
                SELECT value as 'value?', hash, from_address, to_address, block_number, position, data as 'data?', status, incomplete as 'incomplete!'
                FROM transactions
                WHERE chain_id = ?
                AND (from_address = ? OR to_address = ?) COLLATE NOCASE
                AND (block_number > ? OR (block_number = ? AND position > ?))
                ORDER BY block_number ASC, position ASC
                LIMIT ?
            ) sub
            ORDER BY block_number DESC, position DESC"#,
            chain_id,
            from_or_to,
            from_or_to,
            first_known_block,
            first_known_block,
            first_known_position,
            max
        )
        .fetch_all(self.pool())
        .await?;

        let items = rows
            .into_iter()
            .map(|r| Transaction {
                hash: B256::from_str(&r.hash.unwrap()).unwrap(),
                from: Address::from_str(&r.from_address).unwrap(),
                block_number: r.block_number.map(|b| b as u64),
                position: r.position.map(|p| p as u64),
                data: r.data.map(|data| Bytes::from_str(&data).unwrap()),
                to: r.to_address.and_then(|r| Address::from_str(&r).ok()),
                status: r.status.unwrap_or_default() as u64,
                incomplete: r.incomplete,
            })
            .collect();

        Ok(items)
    }

    pub async fn get_older_transactions(
        &self,
        chain_id: u64,
        from_or_to: Address,
        max: u32,
        last_known: Option<TxIdx>,
    ) -> Result<Vec<Transaction>> {
        let from_or_to = from_or_to.to_string();
        let last_known_block = last_known
            .clone()
            .map(|l| l.block_number as i64)
            .unwrap_or(i64::MAX);
        let last_known_position = last_known.map(|l| l.position as i64).unwrap_or(i64::MAX);
        let chain_id = chain_id as i64;

        let rows = sqlx::query!(
            r#" SELECT DISTINCT value as 'value?', hash, from_address, to_address, block_number, position, data as 'data?', status, incomplete as 'incomplete!'
                FROM transactions
                WHERE chain_id = ?
                AND (from_address = ? OR to_address = ?) COLLATE NOCASE
                AND (block_number < ? OR (block_number = ? AND position < ?))
                ORDER BY block_number DESC, position DESC
                LIMIT ?"#,
            chain_id,
            from_or_to,
            from_or_to,
            last_known_block,
            last_known_block,
            last_known_position,
            max
        )
        .fetch_all(self.pool())
        .await?;

        let items = rows
            .into_iter()
            .map(|r| Transaction {
                hash: B256::from_str(&r.hash.unwrap()).unwrap(),
                from: Address::from_str(&r.from_address).unwrap(),
                block_number: r.block_number.map(|b| b as u64),
                position: r.position.map(|p| p as u64),
                data: r.data.map(|data| Bytes::from_str(&data).unwrap()),
                to: r.to_address.and_then(|r| Address::from_str(&r).ok()),
                status: r.status.unwrap_or_default() as u64,
                incomplete: r.incomplete,
            })
            .collect();

        Ok(items)
    }

    pub async fn get_latest_transactions(
        &self,
        chain_id: u64,
        max: u32,
        last_known: Option<TxIdx>,
    ) -> Result<Vec<Transaction>> {
        let last_known_block = last_known
            .clone()
            .map(|l| l.block_number as i64)
            .unwrap_or(i64::MAX);
        let last_known_position = last_known.map(|l| l.position as i64).unwrap_or(i64::MAX);
        let chain_id = chain_id as i64;

        let rows = sqlx::query!(
            r#" SELECT DISTINCT value as 'value?', hash, from_address, to_address, block_number, position, data as 'data?', status, incomplete as 'incomplete!'
                FROM transactions
                WHERE chain_id = ?
                AND (block_number < ? OR (block_number = ? AND position < ?))
                ORDER BY block_number DESC, position DESC
                LIMIT ?"#,
            chain_id,
            last_known_block,
            last_known_block,
            last_known_position,
            max
        )
        .fetch_all(self.pool())
        .await?;

        let items = rows
            .into_iter()
            .map(|r| Transaction {
                hash: B256::from_str(&r.hash.unwrap()).unwrap(),
                from: Address::from_str(&r.from_address).unwrap(),
                block_number: r.block_number.map(|b| b as u64),
                position: r.position.map(|p| p as u64),
                data: r.data.map(|data: String| Bytes::from_str(&data).unwrap()),
                to: r
                    .to_address
                    .and_then(|r: String| Address::from_str(&r).ok()),
                status: r.status.unwrap_or_default() as u64,
                incomplete: r.incomplete,
            })
            .collect();

        Ok(items)
    }

    pub async fn remove_transactions(&self, chain_id: u64) -> color_eyre::Result<()> {
        let chain_id = chain_id as i64;
        sqlx::query!(r#"DELETE FROM transactions where chain_id = ?"#, chain_id)
            .execute(self.pool())
            .await?;

        Ok(())
    }

    pub async fn get_call_count(
        &self,
        chain_id: u64,
        from: Address,
        to: Address,
    ) -> color_eyre::Result<u32> {
        let from = format!("0x{from:x}");
        let to = format!("0x{to:x}");
        let chain_id = chain_id as i64;

        let row = sqlx::query!(
            r#"SELECT count(*) as count FROM transactions WHERE chain_id = ? AND from_address = ? AND to_address = ?"#,
            chain_id,
            from,
            to
        )
        .fetch_one(self.pool())
        .await?;

        Ok(row.count as u32)
    }

    pub async fn get_transaction_addresses(&self, chain_id: u64) -> Result<Vec<Address>> {
        let chain_id = chain_id as i64;
        let addresses = sqlx::query_scalar!(
            r#"
            SELECT DISTINCT address FROM (
                SELECT from_address as address FROM transactions WHERE chain_id = ?
                UNION
                SELECT to_address as address FROM transactions WHERE chain_id = ? AND to_address IS NOT NULL
            )
            "#,
            chain_id, chain_id
        )
        .fetch_all(self.pool())
        .await?;

        Ok(addresses
            .into_iter()
            .filter_map(|addr| addr.and_then(|a| Address::from_str(&a).ok()))
            .collect())
    }
}
