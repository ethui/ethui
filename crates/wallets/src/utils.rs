use ethers::signers::{coins_bip39::English, MnemonicBuilder, Signer};
use iron_types::{Address, ToAlloy};

use super::Result;

pub fn derive_addresses(
    mnemonic: &str,
    derivation_path: &str,
    count: u32,
) -> Vec<(String, Address)> {
    let builder = MnemonicBuilder::<English>::default().phrase(mnemonic);

    (0..count)
        .map(|idx| {
            let path = format!("{}/{}", derivation_path, idx);
            // TODO: what to do about this unwrap?
            let address = derive_from_builder_and_path(builder.clone(), &path).unwrap();

            (path, address)
        })
        .collect()
}

pub fn derive_from_builder_and_path(
    builder: MnemonicBuilder<English>,
    path: &str,
) -> Result<Address> {
    Ok(builder.derivation_path(path)?.build()?.address().to_alloy())
}

pub fn validate_mnemonic(mnemonic: &str) -> bool {
    MnemonicBuilder::<English>::default()
        .phrase(mnemonic)
        .build()
        .is_ok()
}
