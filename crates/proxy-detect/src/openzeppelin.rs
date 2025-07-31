use alloy::{
    network::Network,
    primitives::{b256, Address, B256},
    providers::Provider,
};

use crate::{error::DetectProxyResult, utils::storage_slot_as_address, ProxyType};

const OPEN_ZEPPELIN_PREFIX: B256 =
    b256!("7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3");

pub(crate) async fn detect_open_zeppelin_proxy<N, P: Provider<N>>(
    address: Address,
    provider: P,
) -> DetectProxyResult<Option<ProxyType>>
where
    N: Network,
{
    if let Ok(Some(addr)) = storage_slot_as_address(&provider, address, OPEN_ZEPPELIN_PREFIX).await
    {
        return Ok(Some(ProxyType::OpenZeppelin(addr)));
    }

    Ok(None)
}
