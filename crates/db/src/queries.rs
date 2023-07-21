use ethers::core::types::{Address, U256};
use iron_types::{events, TokenMetadata};
use sqlx::{sqlite::SqliteRow, Row, Sqlite};

type Query<'a> = sqlx::query::Query<'a, Sqlite, sqlx::sqlite::SqliteArguments<'a>>;

pub(super) fn insert_transaction(tx: &events::Tx, chain_id: u32) -> Query {
    sqlx::query(
        r#" INSERT INTO transactions (hash, chain_id, from_address, to_address, block_number, position, value, status)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(hash) DO NOTHING "#,
    )
    .bind(format!("0x{:x}", tx.hash))
    .bind(chain_id)
    .bind(format!("0x{:x}", tx.from))
    .bind(tx.to.map(|a| format!("0x{:x}", a)))
    .bind(tx.block_number as i64)
    .bind(tx.position.unwrap_or(0) as u32)
    .bind(tx.value.to_string())
    .bind(tx.status as u32)
}

pub(super) fn insert_contract(tx: &events::ContractDeployed, chain_id: u32) -> Query {
    sqlx::query(
        r#" INSERT INTO contracts (address, chain_id, deployed_code_hash)
                        VALUES (?,?,?)
                        ON CONFLICT(address, chain_id) DO NOTHING "#,
    )
    .bind(format!("0x{:x}", tx.address))
    .bind(chain_id)
    .bind(tx.code.clone().map(|c| c.to_string()))
}

pub(super) fn native_update_balance<'a>(
    balance: U256,
    chain_id: u32,
    address: Address,
) -> Query<'a> {
    sqlx::query(
        r#" INSERT OR REPLACE INTO native_balances (balance, chain_id, owner)
                        VALUES (?,?,?) "#,
    )
    .bind(balance.to_string())
    .bind(chain_id)
    .bind(format!("0x{:x}", address))
}

pub(super) fn erc20_read_metadata<'a>(
    contract: Address,
    chain_id: u32,
) -> sqlx::query::Map<
    'a,
    Sqlite,
    impl FnMut(<Sqlite as sqlx::Database>::Row) -> sqlx::Result<TokenMetadata> + 'a,
    sqlx::sqlite::SqliteArguments<'a>,
> {
    sqlx::query(
        r#"SELECT decimals, name, symbol
        FROM tokens_metadata
        WHERE contract = ? AND chain_id = ?"#,
    )
    .bind(format!("0x{:x}", contract))
    .bind(chain_id)
    .map(|row| row.try_into().unwrap())
}

pub(super) fn update_erc20_metadata<'a>(
    address: Address,
    chain_id: u32,
    metadata: TokenMetadata,
) -> Query<'a> {
    sqlx::query(
        r#" INSERT OR REPLACE INTO tokens_metadata (contract, chain_id, decimals, name,symbol)
                        VALUES (?,?,?,?,?) "#,
    )
    .bind(format!("0x{:x}", address))
    .bind(chain_id)
    .bind(metadata.decimals)
    .bind(metadata.name)
    .bind(metadata.symbol)
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

pub(super) fn get_tip<'a>(
    owner: Address,
    chain_id: u32,
) -> sqlx::query::Map<
    'a,
    Sqlite,
    impl FnMut(<Sqlite as sqlx::Database>::Row) -> sqlx::Result<u64> + 'a,
    sqlx::sqlite::SqliteArguments<'a>,
> {
    sqlx::query(r#"SELECT tip FROM tips WHERE owner = ? AND chain_id = ?"#)
        .bind(format!("0x{:x}", owner))
        .bind(chain_id)
        .map(|r: SqliteRow| {
            let tip_str = r
                .get::<Option<&str>, _>("tip")
                .unwrap_or("0x0")
                .trim_start_matches("0x");
            u64::from_str_radix(tip_str, 16).unwrap_or(0)
        })
}

pub(super) fn set_tip<'a>(owner: Address, chain_id: u32, tip: u64) -> Query<'a> {
    sqlx::query(
        r#"INSERT OR REPLACE INTO tips (owner, chain_id, tip) 
        VALUES (?,?,?) "#,
    )
    .bind(format!("0x{:x}", owner))
    .bind(chain_id)
    .bind(format!("0x{:x}", tip))
}
