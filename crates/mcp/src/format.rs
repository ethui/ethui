//! Rendering JSON-RPC quantities as strings a human reads.

use alloy_primitives::{U256, utils::format_ether};

use crate::error::{Error, Result};

/// Parse a `0x`-prefixed JSON-RPC quantity into a `u64`.
pub fn hex_to_u64(hex: &str) -> Result<u64> {
    u64::from_str_radix(hex.trim_start_matches("0x"), 16)
        .map_err(|_| Error::malformed(format!("an unparseable quantity: {hex}")))
}

/// Render a `0x`-prefixed wei quantity as ether, without trailing zeros.
pub fn hex_wei_to_eth(hex: &str) -> Result<String> {
    let wei = U256::from_str_radix(hex.trim_start_matches("0x"), 16)
        .map_err(|_| Error::malformed(format!("an unparseable wei amount: {hex}")))?;

    // `format_ether` always pads to 18 decimals; a human reads "1", not
    // "1.000000000000000000".
    let rendered = format_ether(wei);
    let trimmed = rendered.trim_end_matches('0').trim_end_matches('.');

    Ok(if trimmed.is_empty() {
        "0".to_owned()
    } else {
        trimmed.to_owned()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_hex_quantity() {
        assert_eq!(hex_to_u64("0x7a69").unwrap(), 31337);
    }

    #[test]
    fn parses_a_hex_quantity_without_the_prefix() {
        assert_eq!(hex_to_u64("1").unwrap(), 1);
    }

    #[test]
    fn rejects_a_non_hex_quantity() {
        assert!(hex_to_u64("banana").is_err());
    }

    #[test]
    fn renders_a_whole_ether_without_trailing_zeros() {
        assert_eq!(hex_wei_to_eth("0xde0b6b3a7640000").unwrap(), "1");
    }

    #[test]
    fn renders_a_fractional_ether() {
        assert_eq!(hex_wei_to_eth("0x16345785d8a0000").unwrap(), "0.1");
    }

    #[test]
    fn renders_zero_as_a_bare_zero() {
        assert_eq!(hex_wei_to_eth("0x0").unwrap(), "0");
    }

    #[test]
    fn renders_a_balance_larger_than_u64_wei() {
        // 1_000_000 ETH overflows u64 in wei; ether amounts are U256.
        let wei = U256::from(1_000_000u64) * U256::from(10u64).pow(U256::from(18));
        assert_eq!(hex_wei_to_eth(&format!("0x{wei:x}")).unwrap(), "1000000");
    }

    #[test]
    fn rejects_a_non_hex_wei_value() {
        assert!(hex_wei_to_eth("banana").is_err());
    }
}
