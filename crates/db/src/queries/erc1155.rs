use std::str::FromStr;

use common::{Address, Erc1155Token, Erc1155TokenData, U256};
use sqlx::Row;

use crate::DbInner;

impl DbInner {
    pub async fn read_erc1155_balance(
        &self,
        chain_id: u32,
        contract: Address,
        owner: Address,
        token_id: U256,
    ) -> color_eyre::Result<U256> {
        let row = sqlx::query(
            r#"SELECT balance FROM erc1155_tokens WHERE chain_id = ? AND contract = ? AND owner = ? AND token_id = ?"#)
            .bind(chain_id)
            .bind(format!("0x{contract:x}"))
            .bind(format!("0x{owner:x}"))
            .bind(format!("0x{token_id:x}"))
            .fetch_one(self.pool())
            .await?;
        let balance: String = row.get("balance");
        Ok(U256::from_str_radix(&balance, 10).unwrap_or_default())
    }

    pub async fn read_erc1155_uri(
        &self,
        chain_id: u32,
        contract: Address,
        token_id: U256,
    ) -> color_eyre::Result<String> {
        let row = sqlx::query(
            r#"SELECT balance FROM erc1155_tokens WHERE chain_id = ? AND contract = ? AND token_id = ?"#)
            .bind(chain_id)
            .bind(format!("0x{contract:x}"))
            .bind(format!("0x{token_id:x}"))
            .fetch_one(self.pool())
            .await?;
        Ok(row.get("uri"))
    }

    pub async fn read_erc1155_metadata(
        &self,
        chain_id: u32,
        contract: Address,
        token_id: U256,
    ) -> color_eyre::Result<String> {
        let row = sqlx::query(
            r#"SELECT balance FROM erc1155_tokens WHERE chain_id = ? AND contract = ? AND token_id = ?"#)
            .bind(chain_id)
            .bind(format!("0x{contract:x}"))
            .bind(format!("0x{token_id:x}"))
            .fetch_one(self.pool())
            .await?;
        Ok(row.get("metadata"))
    }

    pub async fn save_erc1155_balance(
        &self,
        chain_id: u32,
        contract: Address,
        owner: Address,
        token_id: U256,
        balance: U256,
    ) -> color_eyre::Result<()> {
        sqlx::query(
            r#"INSERT OR REPLACE INTO balances (contract, chain_id, token_id, owner, balance)
                VALUES (?,?,?,?) "#,
        )
        .bind(format!("0x{contract:x}"))
        .bind(chain_id)
        .bind(format!("0x{token_id:x}"))
        .bind(format!("0x{owner:x}"))
        .bind(balance.to_string())
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn process_erc1155_transfer(
        &self,
        chain_id: u32,
        contract: Address,
        from: Address,
        to: Address,
        token_id: U256,
        value: U256,
    ) -> color_eyre::Result<()> {
        let to_balance = self
            .read_erc1155_balance(chain_id, contract, to, token_id)
            .await?;
        let from_balance = self
            .read_erc1155_balance(chain_id, contract, from, token_id)
            .await?;
        if !to.is_zero() {
            // minting or transfer
            self.save_erc1155_token_data(
                contract,
                chain_id,
                token_id,
                to,
                to_balance + value,
                self.read_erc1155_uri(chain_id, contract, token_id).await?,
                self.read_erc1155_metadata(chain_id, contract, token_id)
                    .await?,
            )
            .await?;
        }
        if value == from_balance {
            sqlx::query(
                r#" DELETE FROM erc1155_tokens 
                WHERE chain_id = ? AND contract = ? AND token_id = ? AND owner = ?"#,
            )
            .bind(chain_id)
            .bind(format!("0x{contract:x}"))
            .bind(format!("0x{token_id:x}"))
            .bind(format!("0x{from:x}"))
            .execute(self.pool())
            .await?;
        } else {
            self.save_erc1155_balance(chain_id, contract, from, token_id, from_balance - value)
                .await?;
        }

        Ok(())
    }

    pub async fn get_erc1155_tokens_with_missing_data(
        &self,
        chain_id: u32,
    ) -> color_eyre::Result<Vec<Erc1155Token>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT * FROM erc1155_tokens
            WHERE chain_id = ? AND (uri IS NULL OR metadata IS NULL)"#,
        )
        .bind(chain_id)
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;
        Ok(res)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn save_erc1155_token_data(
        &self,
        contract: Address,
        chain_id: u32,
        token_id: U256,
        owner: Address,
        balance: U256,
        uri: String,
        metadata: String,
    ) -> color_eyre::Result<()> {
        sqlx::query(
        r#" INSERT OR REPLACE INTO erc1155_tokens (contract, chain_id, token_id, owner, balance, uri, metadata)
                VALUES (?,?,?,?,?,?,?) "#,
        )
        .bind(format!("0x{contract:x}"))
        .bind(chain_id)
        .bind(format!("0x{token_id:x}"))
        .bind(format!("0x{owner:x}"))
        .bind(balance.to_string())
        .bind(uri)
        .bind(metadata)
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn get_erc1155_collections_with_missing_data(
        &self,
        chain_id: u32,
    ) -> color_eyre::Result<Vec<Address>> {
        let res: Vec<Address> = sqlx::query(
            r#"SELECT DISTINCT contract 
                FROM erc1155_tokens
                WHERE chain_id = ? 
                AND contract NOT IN
                (SELECT contract FROM erc1155_collections WHERE chain_id = ?) "#,
        )
        .bind(chain_id)
        .bind(chain_id)
        .map(|row| Address::from_str(row.get::<&str, _>("contract")).unwrap())
        .fetch_all(self.pool())
        .await?;
        Ok(res)
    }

    pub async fn save_erc1155_collection(
        &self,
        contract: Address,
        chain_id: u32,
        name: String,
        symbol: String,
    ) -> color_eyre::Result<()> {
        sqlx::query(
            r#" INSERT OR REPLACE INTO erc1155_collections (contract, chain_id, name, symbol)
                      VALUES (?,?,?,?) "#,
        )
        .bind(format!("0x{contract:x}"))
        .bind(chain_id)
        .bind(name)
        .bind(symbol)
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn get_erc1155_tokens(
        &self,
        chain_id: u32,
        owner: Address,
    ) -> color_eyre::Result<Vec<Erc1155TokenData>> {
        let res: Vec<Erc1155TokenData> = sqlx::query(
        r#" SELECT erc1155_tokens.*, collection.name, collection.symbol
                FROM erc1155_tokens
                LEFT JOIN erc1155_collections as collection
                ON collection.contract = erc1155_tokens.contract AND collection.chain_id = erc1155_tokens.chain_id
                WHERE erc1155_tokens.chain_id = ? AND erc1155_tokens.owner = ?"#,
      )
      .bind(chain_id)
      .bind(format!("0x{owner:x}"))
      .map(|row| row.try_into().unwrap())
      .fetch_all(self.pool())
      .await?;
        Ok(res)
    }
}
