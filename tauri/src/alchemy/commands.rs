use super::{Alchemy, Result};
use crate::types::{ChecksummedAddress, GlobalState};

/// call to fetch balances
#[tauri::command]
pub async fn alchemy_fetch_balances(chain_id: u32, address: ChecksummedAddress) -> Result<()> {
    let alchemy = Alchemy::write().await;
    alchemy.fetch_balances(chain_id, address).await
}
