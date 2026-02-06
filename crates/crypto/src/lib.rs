//! Encryption and decryption of secrets
//!
//! This largely follows the recommendations described in
//! https://kerkour.com/rust-file-encryption-chacha20poly1305-argon2
//! Encrypted secrets are secured by a password. We use Argon2 to derive a key from it, and then
//! the ChaCha20poly1305 scheme to encrypt the data.

use aead::{KeyInit, OsRng, rand_core::RngCore as _};
use chacha20poly1305::XChaCha20Poly1305;
use color_eyre::{Result, eyre::eyre};
use zeroize::Zeroize;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct EncryptedData<T: serde::Serialize + serde::de::DeserializeOwned> {
    salt: [u8; 32],
    nonce: [u8; 19],
    ciphertext: Vec<u8>,

    #[serde(skip)]
    phantom: std::marker::PhantomData<T>,
}

/// Encrypts a password-protected secret
pub fn encrypt<T>(data: &T, password: &str) -> Result<EncryptedData<T>>
where
    T: serde::Serialize + serde::de::DeserializeOwned,
{
    let mut salt = [0u8; 32];
    let mut nonce = [0u8; 19];

    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce);

    let mut key = password_to_key(password, &salt)?;

    let aead = XChaCha20Poly1305::new(key[..32].into());
    let encryptor = aead::stream::EncryptorBE32::from_aead(aead, nonce.as_ref().into());

    let json = serde_json::to_string(data)
        .map_err(|e| eyre!("Failed to serialize data for encryption: {}", e))?;
    let bytes = json.as_bytes();
    let ciphertext = encryptor
        .encrypt_last(bytes)
        .map_err(|e| eyre!("Encryption failed: {}", e))?;

    let res = EncryptedData {
        salt,
        nonce,
        ciphertext,
        phantom: Default::default(),
    };

    // zero out sensitive data
    salt.zeroize();
    nonce.zeroize();
    key.zeroize();

    Ok(res)
}

#[allow(unused)]
/// Decrypts a secret from a file using a password
pub fn decrypt<T>(data: &EncryptedData<T>, password: &str) -> Result<T>
where
    T: serde::Serialize + serde::de::DeserializeOwned,
{
    let mut salt = [0u8; 32];
    let mut nonce = [0u8; 19];

    let mut key = password_to_key(password, &data.salt)?;

    let aead = XChaCha20Poly1305::new(key[..32].into());
    let mut decryptor = aead::stream::DecryptorBE32::from_aead(aead, data.nonce.as_ref().into());

    const BUFFER_LEN: usize = 500 + 16;
    let mut buffer = [0u8; BUFFER_LEN];
    let plaintext: Vec<u8> = decryptor
        .decrypt_last(&data.ciphertext[..])
        .map_err(|_| eyre!("Invalid password"))?;

    // zero out sensitive data
    salt.zeroize();
    nonce.zeroize();
    key.zeroize();

    Ok(serde_json::from_slice(&plaintext)?)
}

fn password_to_key(password: &str, salt: &[u8; 32]) -> Result<Vec<u8>> {
    argon2::hash_raw(password.as_bytes(), salt, &argon2_config())
        .map_err(|e| eyre!("Key derivation failed: {}", e))
}

fn argon2_config<'a>() -> argon2::Config<'a> {
    argon2::Config {
        lanes: 8,
        mem_cost: 16 * 1024,
        time_cost: 8,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq)]
    struct SecretData {
        pub foo: String,
    }

    #[test]
    fn test_encryption() -> Result<()> {
        let password = "foo bar!@";
        let secret = SecretData {
            foo: "The quick brown fox jumps over the lazy dog".to_string(),
        };

        let encrypted_data = encrypt(&secret, password)?;

        let decrypted: SecretData = decrypt(&encrypted_data, password)?;

        assert_eq!(decrypted, secret);
        Ok(())
    }
}
