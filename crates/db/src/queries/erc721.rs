use sqlx::Row;
use std::str::FromStr;

use crate::{Result, DB};
use iron_types::{Address, Erc721Token, Erc721TokenData, U256};

impl DB {
    pub async fn get_erc721_tokens_with_missing_data(
        &self,
        chain_id: u32,
    ) -> Result<Vec<Erc721Token>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT *
        FROM erc721_tokens
        WHERE chain_id = ? AND (uri IS NULL OR metadata IS NULL)"#,
        )
        .bind(chain_id)
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;
        Ok(res)
    }

    pub async fn save_erc721_token_data(
        &self,
        address: Address,
        chain_id: u32,
        token_id: U256,
        owner: Address,
        uri: String,
        metadata: String,
    ) -> Result<()> {
        let mut conn = self.tx().await?;
        super::update_erc721_token(address, chain_id, token_id, owner, uri, metadata)
            .execute(&mut *conn)
            .await?;

        conn.commit().await?;
        Ok(())
    }

    pub async fn get_erc721_collections_with_missing_data(
        &self,
        chain_id: u32,
    ) -> Result<Vec<Address>> {
        let res: Vec<Address> = sqlx::query(
            r#"SELECT DISTINCT contract 
          FROM erc721_tokens
          WHERE chain_id = ? 
          AND contract NOT IN
            (SELECT contract FROM erc721_collections WHERE chain_id = ?) "#,
        )
        .bind(chain_id)
        .bind(chain_id)
        .map(|row| Address::from_str(row.get::<&str, _>("contract")).unwrap())
        .fetch_all(self.pool())
        .await?;
        Ok(res)
    }

    pub async fn save_erc721_collection(
        &self,
        address: Address,
        chain_id: u32,
        name: String,
        symbol: String,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        super::update_erc721_collection(address, chain_id, name, symbol)
            .execute(&mut *conn)
            .await?;

        conn.commit().await?;
        Ok(())
    }

    pub async fn get_erc721_tokens(
        &self,
        chain_id: u32,
        owner: Address,
    ) -> Result<Vec<Erc721TokenData>> {
        let res: Vec<Erc721TokenData> = sqlx::query(
          r#" SELECT erc721_tokens.*, collection.name, collection.symbol
      FROM erc721_tokens
      LEFT JOIN erc721_collections as collection
        ON collection.contract = erc721_tokens.contract AND collection.chain_id = erc721_tokens.chain_id
      WHERE erc721_tokens.chain_id = ? AND erc721_tokens.owner = ?"#,
      )
      .bind(chain_id)
      .bind(format!("0x{:x}", owner))
      .map(|row| row.try_into().unwrap())
      .fetch_all(self.pool())
      .await?;
        Ok(res)
    }
}
