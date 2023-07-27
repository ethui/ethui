use serde::{
    de::{self, Visitor},
    Deserialize,
};

use super::error::Error;
use super::chainlink::ChainlinkFeed;

struct FeedVisitor {}

impl<'de> Visitor<'de> for FeedVisitor {
    type Value = Feed;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("Could not deserialize feed")
    }

    fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
    where
        A: serde::de::SeqAccess<'de>,
    {
        let provider = seq.next_element()?.unwrap();
        let address = seq.next_element()?.unwrap();
        match Feed::create(provider, address) {
            Ok(value) => Ok(value),
            Err(other) => return Err(de::Error::custom(other)),
        }
    }
}


#[derive(Debug, Clone)]
pub enum Feed {
    Chainlink(ChainlinkFeed),
}

impl Feed {
    fn create(provider: &str, address: &str) -> Result<Feed, Error> {
        match provider {
            "chainlink" => Ok(Feed::Chainlink(ChainlinkFeed {
                address: address.to_string(),
            })),
            other => Err(Error::UnsupportedFeedProvider(other.to_string())),
        }
    }
}

impl<'de> Deserialize<'de> for Feed {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        deserializer.deserialize_seq(FeedVisitor {})
    }
}
