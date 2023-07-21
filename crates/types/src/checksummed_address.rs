use ethers::{types::Address, utils::to_checksum};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Hash, Eq, PartialEq, Clone)]
pub struct ChecksummedAddress(pub Address);

impl Serialize for ChecksummedAddress {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&to_checksum(&self.0, None))
    }
}

impl From<Address> for ChecksummedAddress {
    fn from(value: Address) -> Self {
        Self(value)
    }
}

impl ToString for ChecksummedAddress {
    fn to_string(&self) -> String {
        to_checksum(&self.0, None)
    }
}
