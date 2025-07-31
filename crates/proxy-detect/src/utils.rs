use alloy::{
    network::Network,
    primitives::{Address, Bytes, B256, U256},
    providers::Provider,
};

use crate::error::DetectProxyResult;

pub(crate) async fn storage_slot_as_address<N, P: Provider<N>>(
    provider: P,
    address: Address,
    slot: B256,
) -> DetectProxyResult<Option<Address>>
where
    N: Network,
{
    let slot = match provider.get_storage_at(address, slot.into()).latest().await {
        Ok(value) => value,
        Err(e) if e.is_error_resp() => return Ok(None),
        Err(e) => return Err(e)?,
    };

    if !slot.is_zero() {
        return Ok(Some(u256_to_address(slot)));
    }

    Ok(None)
}

pub(crate) fn u256_to_address(u256: U256) -> Address {
    let bytes: Bytes = u256.to_be_bytes::<32>().into();
    Address::from_slice(&bytes[12..])
}

pub(crate) fn bytes_to_b256_fallible(bytes: Bytes) -> Option<B256> {
    if bytes.len() != B256::ZERO.len() {
        return None;
    }
    Some(B256::from_slice(&bytes))
}
