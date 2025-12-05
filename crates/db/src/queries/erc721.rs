use std::str::FromStr;

use ethui_types::{Address, Erc721Token, Erc721TokenData, U256};
use sqlx::Row;

use crate::DbInner;

impl DbInner {
    pub async fn process_erc721_transfer(
        &self,
        chain_id: u64,
        contract: Address,
        _from: Address,
        to: Address,
        token_id: U256,
    ) -> color_eyre::Result<()> {
        if to.is_zero() {
            // burning
            sqlx::query(
                r#" DELETE FROM erc721_tokens WHERE chain_id = ? AND contract = ? AND token_id = ? "#,
            )
            .bind(chain_id as u32)
            .bind(format!("0x{contract:x}"))
            .bind(format!("0x{token_id:x}"))
            .execute(self.pool()).await?;
        } else {
            // minting or transfer
            sqlx::query(
                r#" INSERT OR REPLACE INTO erc721_tokens (contract, chain_id, token_id, owner)
                        VALUES (?,?,?,?)"#,
            )
            .bind(format!("0x{contract:x}"))
            .bind(chain_id as u32)
            .bind(format!("0x{token_id:x}"))
            .bind(format!("0x{to:x}"))
            .execute(self.pool())
            .await?;
        }

        Ok(())
    }
    pub async fn get_erc721_tokens_with_missing_data(
        &self,
        chain_id: u64,
    ) -> color_eyre::Result<Vec<Erc721Token>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT *
        FROM erc721_tokens
        WHERE chain_id = ? AND (uri IS NULL OR metadata IS NULL)"#,
        )
        .bind(chain_id as u32)
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;
        Ok(res)
    }

    pub async fn save_erc721_token_data(
        &self,
        address: Address,
        chain_id: u64,
        token_id: U256,
        owner: Address,
        uri: String,
        metadata: String,
    ) -> color_eyre::Result<()> {
        sqlx::query(
        r#" INSERT OR REPLACE INTO erc721_tokens (contract, chain_id, token_id, owner, uri, metadata)
                        VALUES (?,?,?,?,?,?) "#,
    )
    .bind(format!("0x{address:x}"))
    .bind(chain_id as u32)
    .bind(format!("0x{token_id:x}"))
    .bind(format!("0x{owner:x}"))
    .bind(uri)
    .bind(metadata)
            .execute(self.pool()).await?;

        Ok(())
    }

    pub async fn get_erc721_collections_with_missing_data(
        &self,
        chain_id: u64,
    ) -> color_eyre::Result<Vec<Address>> {
        let res: Vec<Address> = sqlx::query(
            r#"SELECT DISTINCT contract 
          FROM erc721_tokens
          WHERE chain_id = ? 
          AND contract NOT IN
            (SELECT contract FROM erc721_collections WHERE chain_id = ?) "#,
        )
        .bind(chain_id as u32)
        .bind(chain_id as u32)
        .map(|row| Address::from_str(row.get::<&str, _>("contract")).unwrap())
        .fetch_all(self.pool())
        .await?;
        Ok(res)
    }

    pub async fn save_erc721_collection(
        &self,
        address: Address,
        chain_id: u64,
        name: String,
        symbol: String,
    ) -> color_eyre::Result<()> {
        sqlx::query(
            r#" INSERT OR REPLACE INTO erc721_collections (contract, chain_id, name, symbol)
                      VALUES (?,?,?,?) "#,
        )
        .bind(format!("0x{address:x}"))
        .bind(chain_id as u32)
        .bind(name)
        .bind(symbol)
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn get_erc721_tokens(
        &self,
        chain_id: u64,
        owner: Address,
    ) -> color_eyre::Result<Vec<Erc721TokenData>> {
        let res: Vec<Erc721TokenData> = sqlx::query(
          r#" SELECT erc721_tokens.*, collection.name, collection.symbol
      FROM erc721_tokens
      LEFT JOIN erc721_collections as collection
        ON collection.contract = erc721_tokens.contract AND collection.chain_id = erc721_tokens.chain_id
      WHERE erc721_tokens.chain_id = ? AND erc721_tokens.owner = ?"#,
      )
      .bind(chain_id as u32)
      .bind(format!("0x{owner:x}"))
      .map(|row| row.try_into().unwrap())
      .fetch_all(self.pool())
      .await?;
        Ok(res)
    }
}
