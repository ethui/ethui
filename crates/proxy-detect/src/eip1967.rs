use alloy::{
    network::{Network, TransactionBuilder as _},
    primitives::{Address, B256, Bytes, b256, bytes},
    providers::Provider,
};

use crate::{
    ProxyType,
    error::DetectProxyResult,
    utils::{storage_slot_as_address, u256_to_address},
};

// bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
const EIP1967_LOGIC_SLOT: B256 =
    b256!("360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");

// bytes32(uint256(keccak256('eip1967.proxy.beacon')) - 1)
const EIP1967_BEACON_SLOT: B256 =
    b256!("a3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50");

const EIP1967_BEACON_METHODS: [Bytes; 2] = [
    // bytes4(keccak256("implementation()")) padded to 32 bytes
    bytes!("5c60da1b00000000000000000000000000000000000000000000000000000000"),
    // bytes4(keccak256("childImplementation()")) padded to 32 bytes
    // some implementations use this over the standard method name so that the beacon contract is not detected as an EIP-897 proxy itself
    bytes!("da52571600000000000000000000000000000000000000000000000000000000"),
];

pub(crate) async fn detect_eip1967_direct_proxy<N, P: Provider<N>>(
    address: Address,
    provider: P,
) -> DetectProxyResult<Option<ProxyType>>
where
    N: Network,
{
    if let Ok(Some(addr)) = storage_slot_as_address(&provider, address, EIP1967_LOGIC_SLOT).await {
        return Ok(Some(ProxyType::Eip1967Direct(addr)));
    }

    Ok(None)
}

pub(crate) async fn detect_eip1967_beacon_proxy<N, P: Provider<N>>(
    address: Address,
    provider: P,
) -> DetectProxyResult<Option<ProxyType>>
where
    N: Network,
{
    let beacon = if let Ok(Some(addr)) =
        storage_slot_as_address(&provider, address, EIP1967_BEACON_SLOT).await
    {
        addr
    } else {
        return Ok(None);
    };

    let beacon_call_0 = <N as Network>::TransactionRequest::default()
        .with_to(beacon)
        .with_input(EIP1967_BEACON_METHODS[0].clone());

    let beacon_call_1 = <N as Network>::TransactionRequest::default()
        .with_to(beacon)
        .with_input(EIP1967_BEACON_METHODS[1].clone());

    if let Ok(value) = provider.call(beacon_call_0).await {
        let b256: B256 = B256::from_slice(&value);
        return Ok(Some(ProxyType::Eip1967Beacon(u256_to_address(b256.into()))));
    } else if let Ok(value) = provider.call(beacon_call_1).await {
        let b256: B256 = B256::from_slice(&value);
        return Ok(Some(ProxyType::Eip1967Beacon(u256_to_address(b256.into()))));
    };

    Ok(None)
}
