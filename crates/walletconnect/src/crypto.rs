use rand_core::{OsRng, RngCore};

use crate::error::{WcError, WcResult};

// ── Type 0: ChaCha20-Poly1305 with sym_key ────────────────────────────────────
//
// @walletconnect/utils ≥ 2.18 uses ChaCha20-Poly1305, NOT AES-256-GCM.
// Envelope layout (Type 0): [0x00][iv: 12][ciphertext + 16-byte Poly1305 tag]

/// Decrypt a Type-0 envelope.
///
/// Layout: [0x00][iv: 12][ciphertext + 16-byte Poly1305 tag]
pub fn decrypt_type0(envelope: &[u8], sym_key: &[u8; 32]) -> WcResult<Vec<u8>> {
    if envelope.first() != Some(&0x00) {
        return Err(WcError::Crypto("not a type-0 envelope".into()));
    }
    if envelope.len() < 1 + 12 + 16 {
        return Err(WcError::Crypto("type-0 envelope too short".into()));
    }

    let iv =
        <[u8; 12]>::try_from(&envelope[1..13]).map_err(|_| WcError::Crypto("bad iv".into()))?;
    let ciphertext = &envelope[13..];

    decrypt_chacha20poly1305(sym_key, &iv, ciphertext)
}

/// Encrypt plaintext into a Type-0 envelope.
///
/// Layout: [0x00][iv: 12][ciphertext + 16-byte Poly1305 tag]
pub fn encrypt_type0(plaintext: &[u8], sym_key: &[u8; 32]) -> WcResult<Vec<u8>> {
    let mut iv = [0u8; 12];
    OsRng.fill_bytes(&mut iv);

    let ct = encrypt_chacha20poly1305(sym_key, &iv, plaintext)?;

    let mut out = Vec::with_capacity(1 + 12 + ct.len());
    out.push(0x00);
    out.extend_from_slice(&iv);
    out.extend_from_slice(&ct);
    Ok(out)
}

// ── primitives ────────────────────────────────────────────────────────────────
// Raw ChaCha20-Poly1305 encrypt/decrypt live in ethui_crypto, shared with any
// other crate that needs the primitive without its password/KDF opinions.

fn decrypt_chacha20poly1305(key: &[u8; 32], iv: &[u8; 12], ciphertext: &[u8]) -> WcResult<Vec<u8>> {
    ethui_crypto::chacha20poly1305_decrypt(key, iv, ciphertext)
        .map_err(|e| WcError::Crypto(format!("chacha20poly1305 decrypt: {e}")))
}

fn encrypt_chacha20poly1305(key: &[u8; 32], iv: &[u8; 12], plaintext: &[u8]) -> WcResult<Vec<u8>> {
    ethui_crypto::chacha20poly1305_encrypt(key, iv, plaintext)
        .map_err(|e| WcError::Crypto(format!("chacha20poly1305 encrypt: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn type0_roundtrip() {
        let key = [0x42u8; 32];
        let plaintext = b"hello walletconnect";
        let envelope = encrypt_type0(plaintext, &key).unwrap();
        assert_eq!(envelope[0], 0x00);
        assert_eq!(envelope.len(), 1 + 12 + plaintext.len() + 16);
        let recovered = decrypt_type0(&envelope, &key).unwrap();
        assert_eq!(recovered, plaintext);
    }

    #[test]
    fn type0_wrong_key_fails() {
        let key = [0x42u8; 32];
        let wrong_key = [0x99u8; 32];
        let plaintext = b"hello";
        let envelope = encrypt_type0(plaintext, &key).unwrap();
        assert!(decrypt_type0(&envelope, &wrong_key).is_err());
    }
}
