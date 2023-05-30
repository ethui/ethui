use ethers_core::types::{Address, U256};
use sqlx::{sqlite::SqliteRow, Row, Sqlite};

use crate::types::events;

type Query<'a> = sqlx::query::Query<'a, Sqlite, sqlx::sqlite::SqliteArguments<'a>>;

pub(super) fn insert_transaction(tx: &events::Tx, chain_id: u32) -> Query {
    sqlx::query(
        r#" INSERT INTO transactions (hash, chain_id, from_address, to_address, block_number, position, value)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(hash) DO NOTHING "#,
    )
    .bind(format!("0x{:x}", tx.hash))
    .bind(chain_id)
    .bind(format!("0x{:x}", tx.from))
    .bind(tx.to.map(|a| format!("0x{:x}", a)))
    .bind(tx.block_number as i64)
    .bind(tx.position.unwrap_or(0) as u32)
    .bind(tx.value.to_string())
}

pub(super) fn insert_contract(
    tx: &events::ContractDeployed,
    chain_id: u32,
    code_hash: Option<String>,
) -> Query {
    sqlx::query(
        r#" INSERT INTO contracts (address, chain_id, deployed_code_hash)
                        VALUES (?,?,?)
                        ON CONFLICT(address, chain_id) DO NOTHING "#,
    )
    .bind(format!("0x{:x}", tx.address))
    .bind(chain_id)
    .bind(code_hash)
}

/// The horrible return type here can be aliased once `type_alias_impl_trait` is stabilized
/// https://github.com/rust-lang/rust/issues/63063
pub(super) fn erc20_read_balance<'a>(
    token: Address,
    address: Address,
    chain_id: u32,
) -> sqlx::query::Map<
    'a,
    Sqlite,
    impl FnMut(<Sqlite as sqlx::Database>::Row) -> sqlx::Result<U256> + 'a,
    sqlx::sqlite::SqliteArguments<'a>,
> {
    sqlx::query(r#"SELECT balance FROM balances WHERE chain_id = ? AND contract = ? AND owner = ?"#)
        .bind(chain_id)
        .bind(format!("0x{:x}", token))
        .bind(format!("0x{:x}", address))
        .map(|r: SqliteRow| U256::from_dec_str(r.get::<&str, _>("balance")).unwrap_or_default())
}

pub(super) fn erc20_update_balance<'a>(
    token: Address,
    address: Address,
    chain_id: u32,
    balance: U256,
) -> Query<'a> {
    sqlx::query(
        r#" INSERT OR REPLACE INTO balances (chain_id, contract, owner, balance) 
                        VALUES (?,?,?,?) "#,
    )
    .bind(chain_id)
    .bind(format!("0x{:x}", token))
    .bind(format!("0x{:x}", address))
    .bind(balance.to_string())
}

pub(super) fn erc721_transfer<'a>(tx: &events::ERC721Transfer, chain_id: u32) -> Query<'a> {
    if !tx.to.is_zero() {
        // burning
        sqlx::query(
            r#" DELETE FROM nft_tokens WHERE chain_id = ? AND contract = ? AND token_id = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", tx.contract))
        .bind(format!("0x{:x}", tx.token_id))
    } else {
        // minting or transfer
        sqlx::query(
            r#" INSERT INTO nft_tokens (chain_id, contract, token_id, owner)
                            VALUES (?,?,?,?)
                            ON CONFLICT REPLACE"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", tx.contract))
        .bind(format!("0x{:x}", tx.token_id))
        .bind(format!("0x{:x}", tx.to))
    }
}
