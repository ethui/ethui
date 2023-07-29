use ethers::core::types::Address;
use iron_types::ChecksummedAddress;

use crate::SyncResult;

/// call to fetch balances
#[tauri::command]
pub async fn fetch_erc20_balances(chain_id: u32, address: ChecksummedAddress) -> SyncResult<()> {
    if chain_id == 31337 {
        return Ok(());
    }

    Ok(iron_sync_alchemy::commands::fetch_erc20_balances(chain_id, address).await?)
}

/// call to fetch native balance
#[tauri::command]
pub async fn fetch_native_balance(chain_id: u32, address: Address) -> SyncResult<()> {
    if chain_id == 31337 {
        return Ok(());
    }

    Ok(iron_sync_alchemy::commands::fetch_native_balance(chain_id, address).await?)
}

#[tauri::command]
pub async fn fetch_transactions(chain_id: u32, address: Address) -> SyncResult<()> {
    if chain_id == 31337 {
        return Ok(());
    }

    Ok(iron_sync_alchemy::commands::fetch_transactions(chain_id, address).await?)
}
