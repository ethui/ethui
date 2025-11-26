use alloy::{primitives::Bytes, providers::Provider as _};
use ethui_types::{Address, eyre};
use tracing::debug;

pub static FUZZ_DIFF_THRESHOLD: f64 = 0.2;

//pub(crate) async fn update_db_contracts() -> Result<()> {
//    let db = ethui_db::get();
//
//    let contracts = db.get_incomplete_contracts().await?;
//    let mut any_updates = false;
//
//    for (chain_id, address, code) in contracts.into_iter() {
//        let code: Option<Bytes> = match code {
//            Some(code) if code.len() > 0 => Some(code),
//            _ => get_code(chain_id, address).await.ok(),
//        };
//
//        let code = match code {
//            Some(code) => code,
//            None => continue,
//        };
//
//        let forge = FORGE.read().await;
//
//        match forge.get_abi_for(&code) {
//            None => continue,
//            Some(abi) => {
//                any_updates = true;
//                trace!(
//                    "updating contract {chain_id} {address} with ABI: {}",
//                    abi.name
//                );
//                db.insert_contract_with_abi(
//                    chain_id,
//                    address,
//                    Some(&code),
//                    Some(serde_json::to_string(&abi.abi)?),
//                    Some(abi.name),
//                    None,
//                )
//                .await?
//            }
//        };
//    }
//
//    if any_updates {
//        ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
//    }
//
//    Ok(())
//}

pub async fn get_code(chain_id: u32, address: Address) -> color_eyre::Result<Bytes> {
    debug!(
        "no code in db. fetching from provider for address 0x{:x}",
        address
    );

    let provider = ethui_networks::get_provider(chain_id).await?;
    provider
        .get_code_at(address)
        .await
        .map_err(|e| eyre!("Failed to get code for chain ID {}: {}", chain_id, e))
}

/// Very simple fuzzy matching of contract bytecode.
///
/// Will fail for small contracts that are essentially all immutable variables.
/// Taken from https://github.com/foundry-rs/foundry/blob/02e430c20fb7ba1794f5cabdd7eb73182baf4e7e/common/src/contracts.rs#L96-L114
pub fn diff_score(a: &[u8], b: &[u8]) -> f64 {
    let cutoff_len = usize::min(a.len(), b.len());
    if cutoff_len == 0 {
        return 1.0;
    }

    let a = &a[..cutoff_len];
    let b = &b[..cutoff_len];
    let mut diff_chars = 0;
    for i in 0..cutoff_len {
        if a[i] != b[i] {
            diff_chars += 1;
        }
    }
    diff_chars as f64 / cutoff_len as f64
}
