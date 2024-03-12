use sqlx::Row;
use std::str::FromStr;

use crate::{DbInner, Result};
use iron_types::{Address, Erc721Token, Erc721TokenData, U256};

impl DbInner {
    pub async fn process_erc721_transfer(
        &self,
        chain_id: u32,
        contract: Address,
        _from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<()> {
        if to.is_zero() {
            // burning
            sqlx::query(
                r#" DELETE FROM erc721_tokens WHERE chain_id = ? AND contract = ? AND token_id = ? "#,
            )
            .bind(chain_id)
            .bind(format!("0x{:x}", contract))
            .bind(format!("0x{:x}", token_id))
            .execute(self.pool()).await?;
        } else {
            // minting or transfer
            sqlx::query(
                r#" INSERT OR REPLACE INTO erc721_tokens (contract, chain_id, token_id, owner)
                        VALUES (?,?,?,?)"#,
            )
            .bind(format!("0x{:x}", contract))
            .bind(chain_id)
            .bind(format!("0x{:x}", token_id))
            .bind(format!("0x{:x}", to))
            .execute(self.pool())
            .await?;
        }

        Ok(())
    }
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
        sqlx::query(
        r#" INSERT OR REPLACE INTO erc721_tokens (contract, chain_id, token_id, owner, uri, metadata)
                        VALUES (?,?,?,?,?,?) "#,
    )
    .bind(format!("0x{:x}", address))
    .bind(chain_id)
    .bind(format!("0x{:x}", token_id))
    .bind(format!("0x{:x}", owner))
    .bind(uri)
    .bind(metadata)
            .execute(self.pool()).await?;

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
        sqlx::query(
            r#" INSERT OR REPLACE INTO erc721_collections (contract, chain_id, name, symbol)
                      VALUES (?,?,?,?) "#,
        )
        .bind(format!("0x{:x}", address))
        .bind(chain_id)
        .bind(name)
        .bind(symbol)
        .execute(self.pool())
        .await?;

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
