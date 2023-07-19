use ethers::signers::{coins_bip39::English, MnemonicBuilder, Signer};
use iron_types::ChecksummedAddress;

use super::Result;

pub fn derive_addresses(
    mnemonic: &str,
    derivation_path: &str,
    count: u32,
) -> Vec<(String, ChecksummedAddress)> {
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
) -> Result<ChecksummedAddress> {
    Ok(builder.derivation_path(path)?.build()?.address().into())
}
