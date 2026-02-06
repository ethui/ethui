use std::{sync::Arc, time::Duration};

use color_eyre::eyre::eyre;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_types::prelude::*;
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, MutexGuard, RwLock, RwLockReadGuard},
    task::JoinHandle,
};
use zeroize::Zeroizing;

/// A cache for secret material (private keys, mnemonics) that automatically expires after a
/// timeout. Wraps the secret in `SecretVec` for memory safety (mlock'd pages).
///
/// The additional `Mutex` within is there because `SecretVec` is not `Send`.
#[derive(Debug, Clone, Default)]
pub struct SecretCache {
    secret: Arc<RwLock<Option<Mutex<SecretVec<u8>>>>>,
    expirer: Arc<RwLock<Option<JoinHandle<()>>>>,
}

impl SecretCache {
    /// Returns `true` if a secret is currently cached (not yet expired).
    pub async fn is_unlocked(&self) -> bool {
        self.secret.read().await.is_some()
    }

    /// Stores a `SecretVec` in the cache and sets a 60-second expiration timer.
    /// Aborts any existing expirer task before replacing.
    pub async fn store(&self, secret: SecretVec<u8>) {
        let mut expirer_handle = self.expirer.write().await;
        let mut secret_handle = self.secret.write().await;

        // abort the previous expirer so it doesn't clear the new secret
        if let Some(handle) = expirer_handle.take() {
            handle.abort();
        }

        *secret_handle = Some(Mutex::new(secret));

        // set up cache expiration for 1 minute
        let clone = Arc::clone(&self.secret);
        *expirer_handle = Some(tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(60)).await;
            clone.write().await.take();
        }));
    }

    /// Acquires a read lock on the cached secret, returning an error if the cache is empty.
    ///
    /// Callers should ensure the cache is populated first (typically by calling `unlock`),
    /// but this method handles the race where the expirer task clears the cache in between.
    pub async fn read(&self) -> color_eyre::Result<SecretGuard<'_>> {
        let guard = self.secret.read().await;
        if guard.is_none() {
            return Err(eyre!("secret cache is empty; wallet may be locked"));
        }
        Ok(SecretGuard(guard))
    }
}

/// RAII guard that holds a read lock on the secret cache and provides access to the inner
/// `Mutex<SecretVec<u8>>`.
pub struct SecretGuard<'a>(RwLockReadGuard<'a, Option<Mutex<SecretVec<u8>>>>);

impl SecretGuard<'_> {
    pub async fn lock(&self) -> MutexGuard<'_, SecretVec<u8>> {
        // safe: we only construct SecretGuard when the Option is Some
        self.0.as_ref().unwrap().lock().await
    }
}

/// Converts a `String` (mnemonic or private key) into a `SecretVec<u8>`.
pub fn string_into_secret(value: String) -> SecretVec<u8> {
    let bytes = Zeroizing::new(value.into_bytes());
    SecretVec::new(bytes.len(), |s| {
        s.copy_from_slice(&bytes);
    })
}

/// Recovers a `String` from a `SecretVec<u8>`.
pub fn string_from_secret(secret: &SecretVec<u8>) -> String {
    let borrowed = secret.borrow();
    String::from_utf8(borrowed.to_vec()).unwrap()
}

/// Opens a wallet-unlock dialog and attempts to receive a valid password up to 3 times.
///
/// The `try_decrypt` closure is called with each password attempt and should return
/// `Ok(secret_bytes)` on success or `Err(...)` on failure.
///
/// On success, the decrypted secret is stored in the provided `SecretCache`.
pub async fn unlock_with_dialog<F>(
    cache: &SecretCache,
    wallet_name: &str,
    mut try_decrypt: F,
) -> color_eyre::Result<()>
where
    F: FnMut(&str) -> color_eyre::Result<SecretVec<u8>>,
{
    if cache.is_unlocked().await {
        return Ok(());
    }

    let dialog = Dialog::new("wallet-unlock", serde_json::json!({ "name": wallet_name }));
    dialog.open().await?;

    for _ in 0..3 {
        let password = if let Some(DialogMsg::Data(payload)) = dialog.recv().await {
            let password = payload["password"].clone();
            password
                .as_str()
                .with_context(|| "wallet unlock rejected by user".to_string())?
                .to_string()
        } else {
            return Err(eyre!("wallet unlock rejected by user"));
        };

        if let Ok(secret) = try_decrypt(&password) {
            cache.store(secret).await;
            return Ok(());
        }

        dialog.send("failed", None).await?;
    }

    Err(eyre!("user failed to unlock the wallet"))
}
