use alloy::{
    network::Network,
    primitives::{Address, Bytes, bytes},
    providers::Provider,
};

use crate::{ProxyType, error::DetectProxyResult};

const EIP1167_PREFIX: Bytes = bytes!("363d3d373d3d3d363d");
const EIP1167_SUFFIX: Bytes = bytes!("57fd5bf3");
const EIP1167_SUFFIX_OFFSET_FROM_ADDRESS_END: usize = 11;

pub(crate) async fn detect_eip1167_minimal_proxy<N, P: Provider<N>>(
    address: Address,
    provider: P,
) -> DetectProxyResult<Option<ProxyType>>
where
    N: Network,
{
    let code = provider.get_code_at(address).await?;

    if !code.starts_with(&EIP1167_PREFIX) {
        return Ok(None);
    }

    // detect length of address (20 bytes non-optimized, 0 < N < 20 bytes for vanity addresses)
    // push1 ... push20 use opcode 0x60 ... 0x73
    let address_len = code[EIP1167_PREFIX.len()].saturating_sub(0x5f) as usize;

    if !(1..=20).contains(&address_len) {
        return Ok(None);
    }

    let address_pos = EIP1167_PREFIX.len() + 1;
    let suffix = &code[address_pos + address_len + EIP1167_SUFFIX_OFFSET_FROM_ADDRESS_END..];

    if !suffix.starts_with(&EIP1167_SUFFIX) {
        return Ok(None);
    }

    let address_hex = &code[address_pos..address_pos + address_len];
    let address = Address::left_padding_from(address_hex);

    Ok(Some(ProxyType::Eip1167(address)))
}
