mod comptroller;
mod eip1167;
mod eip1967;
mod eip897;
pub mod error;
mod openzeppelin;
mod safe;
mod utils;

use alloy::{network::Network, primitives::Address, providers::Provider};
use error::DetectProxyResult;

#[derive(Debug, PartialEq)]
pub enum ProxyType {
    Eip1167(Address),
    Eip1967Direct(Address),
    Eip1967Beacon(Address),
    OpenZeppelin(Address),
    Eip897(Address),
    Safe(Address),
    Comptroller(Address),
}

impl ProxyType {
    pub fn implementation(&self) -> Address {
        match self {
            ProxyType::Eip1167(addr)
            | ProxyType::Eip1967Direct(addr)
            | ProxyType::Eip1967Beacon(addr)
            | ProxyType::OpenZeppelin(addr)
            | ProxyType::Eip897(addr)
            | ProxyType::Safe(addr)
            | ProxyType::Comptroller(addr) => *addr,
        }
    }
}

pub async fn detect_proxy<N, P: Provider<N>>(
    address: Address,
    provider: &P,
) -> DetectProxyResult<Option<ProxyType>>
where
    N: Network,
{
    if let Some(proxy_type) = eip1167::detect_eip1167_minimal_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    if let Some(proxy_type) = eip1967::detect_eip1967_direct_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    if let Some(proxy_type) = eip1967::detect_eip1967_beacon_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    if let Some(proxy_type) = openzeppelin::detect_open_zeppelin_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    if let Some(proxy_type) = eip897::detect_eip897_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    if let Some(proxy_type) = safe::detect_safe_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    if let Some(proxy_type) = comptroller::detect_comptroller_proxy(address, provider).await? {
        return Ok(Some(proxy_type));
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy::{primitives::address, providers::ProviderBuilder, transports::http::reqwest::Url};
    use lazy_static::lazy_static;
    use rstest::*;

    lazy_static! {
        static ref MAINNET_RPC: Url = Url::parse(
            &std::env::var("ETH_MAINNET_RPC").unwrap_or("https://eth.rpc.blxrbdn.com".to_string())
        )
        .unwrap();
    }

    #[rstest]
    #[case::eip1167(address!("0x6d5d9b6ec51c15f45bfa4c460502403351d5b999"), ProxyType::Eip1167(address!("0x210fF9Ced719E9bf2444DbC3670BAC99342126fA")))]
    #[case::eip1167_vanity(address!("0xa81043fd06D57D140f6ad8C2913DbE87fdecDd5F"), ProxyType::Eip1167(address!("0x0000000010fd301be3200e67978e3cc67c962f48")))]
    #[case::eip1967_direct(address!("0xA7AeFeaD2F25972D80516628417ac46b3F2604Af"), ProxyType::Eip1967Direct(address!("0x4bd844f72a8edd323056130a86fc624d0dbcf5b0")))]
    #[case::eip1967_direct(address!("0x8260b9eC6d472a34AD081297794d7Cc00181360a"), ProxyType::Eip1967Direct(address!("0xe4e4003afe3765aca8149a82fc064c0b125b9e5a")))]
    #[case::eip1967_beacon(address!("0xDd4e2eb37268B047f55fC5cAf22837F9EC08A881"), ProxyType::Eip1967Beacon(address!("0xe5c048792dcf2e4a56000c8b6a47f21df22752d1")))]
    #[case::eip1967_beacon(address!("0x114f1388fAB456c4bA31B1850b244Eedcd024136"), ProxyType::Eip1967Beacon(address!("0x0fa0fd98727c443dd5275774c44d27cff9d279ed")))]
    #[case::openzeppelin(address!("0xC986c2d326c84752aF4cC842E033B9ae5D54ebbB"), ProxyType::OpenZeppelin(address!("0x0656368c4934e56071056da375d4a691d22161f8")))]
    #[case::eip897(address!("0x8260b9eC6d472a34AD081297794d7Cc00181360a"), ProxyType::Eip1967Direct(address!("0xe4e4003afe3765aca8149a82fc064c0b125b9e5a")))]
    #[case::eip897(address!("0x0DA0C3e52C977Ed3cBc641fF02DD271c3ED55aFe"), ProxyType::Safe(address!("0xd9db270c1b5e3bd161e8c8503c55ceabee709552")))]
    #[case::eip897(address!("0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B"), ProxyType::Comptroller(address!("0xbafe01ff935c7305907c33bf824352ee5979b526")))]
    #[tokio::test]
    async fn mainnet(#[case] proxy: Address, #[case] impl_: ProxyType) {
        let provider = ProviderBuilder::new().on_http(MAINNET_RPC.clone());

        let result = detect_proxy(proxy, &provider).await.unwrap();

        assert_eq!(result, Some(impl_));
    }

    #[rstest]
    #[case::usdc_impl(address!("0x43506849D7C04F9138D1A2050bbF3A0c054402dd"))]
    #[case::dai(address!("0x6B175474E89094C44Da98b954EedeAC495271d0F"))]
    #[tokio::test]
    async fn not_proxy(#[case] proxy: Address) {
        let provider = ProviderBuilder::new().on_http(MAINNET_RPC.clone());

        let result = detect_proxy(proxy, &provider).await.unwrap();

        assert_eq!(result, None);
    }
}
