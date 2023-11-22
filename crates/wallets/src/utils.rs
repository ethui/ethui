use std::path::Path;

use ethers::signers::{coins_bip39::English, HDPath, MnemonicBuilder, Signer};
use iron_types::{Address, ToAlloy};
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

use super::Result;
use crate::Error;

pub(crate) static HID_MUTEX: Lazy<Mutex<()>> = Lazy::new(Default::default);

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

pub(crate) async fn ledger_derive(path: &str) -> Result<Address> {
    let _guard = HID_MUTEX.lock().await;

    let ledger = ethers::signers::Ledger::new(HDPath::Other(path.into()), 1)
        .await
        .map_err(|e| Error::Ledger(e.to_string()))?;

    Ok(ledger
        .get_address()
        .await
        .map_err(|e| Error::Ledger(e.to_string()))?
        .to_alloy())
}

pub(crate) async fn ledger_derive_multiple(paths: Vec<String>) -> Result<Vec<(String, Address)>> {
    let mut res = vec![];

    for path in paths.into_iter() {
        res.push((path.clone(), ledger_derive(&path).await?))
    }

    Ok(res)
}

pub fn read_pgp_secret(file: &Path) -> Result<String> {
    let mut ctx = gpgme::Context::from_protocol(gpgme::Protocol::OpenPgp)?;

    let mut input = std::fs::File::open(file)?;
    let mut output = vec![];
    ctx.decrypt(&mut input, &mut output)?;

    Ok(String::from_utf8(output)?.trim().to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn detect() {
        let addresses = ledger_derive("m/44'/60'/0'/0/0").await;

        assert!(addresses.is_ok());
    }
}
