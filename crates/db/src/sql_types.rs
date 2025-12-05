//! SQLite wrapper types for Alloy primitives.
//!
//! These types implement sqlx's Encode, Decode, and Type traits to allow
//! seamless serialization of Alloy types to/from SQLite TEXT columns.

use std::borrow::Cow;
use std::str::FromStr;

use alloy::primitives::{Address, Bytes, B256, U256};
use sqlx::encode::IsNull;
use sqlx::error::BoxDynError;
use sqlx::sqlite::{SqliteArgumentValue, SqliteTypeInfo, SqliteValueRef};
use sqlx::{Decode, Encode, Sqlite, Type};

/// SQLite wrapper for Alloy Address type.
/// Stores as lowercase hex string with 0x prefix.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlAddress(String);

impl SqlAddress {
    /// Create from a raw string (for decoding from database).
    pub fn new(s: String) -> Self {
        Self(s)
    }
}

impl From<Address> for SqlAddress {
    fn from(addr: Address) -> Self {
        SqlAddress(format!("0x{:x}", addr))
    }
}

impl From<&Address> for SqlAddress {
    fn from(addr: &Address) -> Self {
        SqlAddress(format!("0x{:x}", addr))
    }
}

impl TryFrom<SqlAddress> for Address {
    type Error = alloy::primitives::hex::FromHexError;

    fn try_from(sql: SqlAddress) -> Result<Self, Self::Error> {
        Address::from_str(&sql.0)
    }
}

impl<'q> Encode<'q, Sqlite> for SqlAddress {
    fn encode_by_ref(
        &self,
        args: &mut Vec<SqliteArgumentValue<'q>>,
    ) -> Result<IsNull, BoxDynError> {
        args.push(SqliteArgumentValue::Text(Cow::Owned(self.0.clone())));
        Ok(IsNull::No)
    }
}

impl<'r> Decode<'r, Sqlite> for SqlAddress {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, BoxDynError> {
        let s = <&str as Decode<Sqlite>>::decode(value)?;
        Ok(SqlAddress(s.to_owned()))
    }
}

impl Type<Sqlite> for SqlAddress {
    fn type_info() -> SqliteTypeInfo {
        <String as Type<Sqlite>>::type_info()
    }

    fn compatible(ty: &SqliteTypeInfo) -> bool {
        <String as Type<Sqlite>>::compatible(ty)
    }
}

/// SQLite wrapper for Alloy U256 type.
/// Stores as decimal string.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlU256(String);

impl SqlU256 {
    /// Create from a raw string (for decoding from database).
    pub fn new(s: String) -> Self {
        Self(s)
    }
}

impl From<U256> for SqlU256 {
    fn from(val: U256) -> Self {
        SqlU256(val.to_string())
    }
}

impl From<&U256> for SqlU256 {
    fn from(val: &U256) -> Self {
        SqlU256(val.to_string())
    }
}

impl TryFrom<SqlU256> for U256 {
    type Error = alloy::primitives::ruint::ParseError;

    fn try_from(sql: SqlU256) -> Result<Self, Self::Error> {
        U256::from_str_radix(&sql.0, 10)
    }
}

impl<'q> Encode<'q, Sqlite> for SqlU256 {
    fn encode_by_ref(
        &self,
        args: &mut Vec<SqliteArgumentValue<'q>>,
    ) -> Result<IsNull, BoxDynError> {
        args.push(SqliteArgumentValue::Text(Cow::Owned(self.0.clone())));
        Ok(IsNull::No)
    }
}

impl<'r> Decode<'r, Sqlite> for SqlU256 {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, BoxDynError> {
        let s = <&str as Decode<Sqlite>>::decode(value)?;
        Ok(SqlU256(s.to_owned()))
    }
}

impl Type<Sqlite> for SqlU256 {
    fn type_info() -> SqliteTypeInfo {
        <String as Type<Sqlite>>::type_info()
    }

    fn compatible(ty: &SqliteTypeInfo) -> bool {
        <String as Type<Sqlite>>::compatible(ty)
    }
}

/// SQLite wrapper for Alloy B256 (32-byte hash) type.
/// Stores as lowercase hex string with 0x prefix.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlB256(String);

impl SqlB256 {
    /// Create from a raw string (for decoding from database).
    pub fn new(s: String) -> Self {
        Self(s)
    }
}

impl From<B256> for SqlB256 {
    fn from(hash: B256) -> Self {
        SqlB256(format!("0x{:x}", hash))
    }
}

impl From<&B256> for SqlB256 {
    fn from(hash: &B256) -> Self {
        SqlB256(format!("0x{:x}", hash))
    }
}

impl TryFrom<SqlB256> for B256 {
    type Error = alloy::primitives::hex::FromHexError;

    fn try_from(sql: SqlB256) -> Result<Self, Self::Error> {
        B256::from_str(&sql.0)
    }
}

impl<'q> Encode<'q, Sqlite> for SqlB256 {
    fn encode_by_ref(
        &self,
        args: &mut Vec<SqliteArgumentValue<'q>>,
    ) -> Result<IsNull, BoxDynError> {
        args.push(SqliteArgumentValue::Text(Cow::Owned(self.0.clone())));
        Ok(IsNull::No)
    }
}

impl<'r> Decode<'r, Sqlite> for SqlB256 {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, BoxDynError> {
        let s = <&str as Decode<Sqlite>>::decode(value)?;
        Ok(SqlB256(s.to_owned()))
    }
}

impl Type<Sqlite> for SqlB256 {
    fn type_info() -> SqliteTypeInfo {
        <String as Type<Sqlite>>::type_info()
    }

    fn compatible(ty: &SqliteTypeInfo) -> bool {
        <String as Type<Sqlite>>::compatible(ty)
    }
}

/// SQLite wrapper for Alloy Bytes type.
/// Stores as hex string with 0x prefix.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlBytes(String);

impl SqlBytes {
    /// Create from a raw string (for decoding from database).
    pub fn new(s: String) -> Self {
        Self(s)
    }
}

impl From<Bytes> for SqlBytes {
    fn from(bytes: Bytes) -> Self {
        SqlBytes(bytes.to_string())
    }
}

impl From<&Bytes> for SqlBytes {
    fn from(bytes: &Bytes) -> Self {
        SqlBytes(bytes.to_string())
    }
}

impl TryFrom<SqlBytes> for Bytes {
    type Error = alloy::primitives::hex::FromHexError;

    fn try_from(sql: SqlBytes) -> Result<Self, Self::Error> {
        Bytes::from_str(&sql.0)
    }
}

impl<'q> Encode<'q, Sqlite> for SqlBytes {
    fn encode_by_ref(
        &self,
        args: &mut Vec<SqliteArgumentValue<'q>>,
    ) -> Result<IsNull, BoxDynError> {
        args.push(SqliteArgumentValue::Text(Cow::Owned(self.0.clone())));
        Ok(IsNull::No)
    }
}

impl<'r> Decode<'r, Sqlite> for SqlBytes {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, BoxDynError> {
        let s = <&str as Decode<Sqlite>>::decode(value)?;
        Ok(SqlBytes(s.to_owned()))
    }
}

impl Type<Sqlite> for SqlBytes {
    fn type_info() -> SqliteTypeInfo {
        <String as Type<Sqlite>>::type_info()
    }

    fn compatible(ty: &SqliteTypeInfo) -> bool {
        <String as Type<Sqlite>>::compatible(ty)
    }
}
