//! Deserialization helpers

use serde::{Deserialize, Deserializer};

fn optional_string_or_array<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum OneOrMany {
        One(String),
        Many(Vec<String>),
    }

    match Option<OneOrMany>::deserialize(deserializer)? {
        None => Ok(vec![]),
        Some(OneOrMany::One(s)) => Ok(vec![s]),
        Some(OneOrMany::Many(v)) => Ok(v),
    }
}

