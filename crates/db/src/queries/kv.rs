use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::{DbInner, Result};

impl DbInner {
    pub async fn kv_set<K, V>(&self, key: &K, value: &V) -> Result<()>
    where
        K: Serialize,
        V: Serialize + DeserializeOwned,
    {
        let key = serde_json::to_string(key)?;
        let value = serde_json::to_string(value)?;

        sqlx::query!(
            r#" INSERT INTO kv (key, value)
                VALUES (?,?)
                ON CONFLICT(key) DO UPDATE SET value = ? "#,
            key,
            value,
            value
        )
        .execute(self.pool())
        .await?;
        Ok(())
    }

    pub async fn kv_get<K, V>(&self, key: &K) -> Result<Option<V>>
    where
        K: Serialize,
        V: DeserializeOwned,
    {
        let key = serde_json::to_string(key)?;

        let res = sqlx::query!(
            r#" SELECT value
                FROM kv
                WHERE key = ? "#,
            key
        )
        .fetch_optional(self.pool())
        .await?;

        Ok(res.map(|r| serde_json::from_str(&r.value).unwrap()))
    }
}
