use alloy::{
    network::{Network, TransactionBuilder as _},
    primitives::{Address, B256, b256},
    providers::Provider,
};

use crate::{
    ProxyType,
    error::DetectProxyResult,
    utils::{bytes_to_b256_fallible, u256_to_address},
};

const SAFE_INTERFACE: [B256; 1] = [
    // bytes4(keccak256("masterCopy()")) padded to 32 bytes
    b256!("a619486e00000000000000000000000000000000000000000000000000000000"),
];

pub(crate) async fn detect_safe_proxy<N, P: Provider<N>>(
    address: Address,
    provider: P,
) -> DetectProxyResult<Option<ProxyType>>
where
    N: Network,
{
    let call_0 = <N as Network>::TransactionRequest::default()
        .with_to(address)
        .with_input(SAFE_INTERFACE[0]);

    let value = match provider.call(call_0).await {
        Ok(value) => value,
        Err(e) if e.is_error_resp() => return Ok(None),
        Err(e) => return Err(e)?,
    };

    match bytes_to_b256_fallible(value) {
        None => Ok(None),
        Some(b256) => Ok(Some(ProxyType::Safe(u256_to_address(b256.into())))),
    }
}
