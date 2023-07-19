use ethers::core::types::Address;
use iron_types::{ChecksummedAddress, GlobalState};

use super::{Alchemy, Result};

/// call to fetch balances
#[tauri::command]
pub async fn alchemy_fetch_erc20_balances(
    chain_id: u32,
    address: ChecksummedAddress,
) -> Result<()> {
    Alchemy::read()
        .await
        .fetch_erc20_balances(chain_id, address)
        .await
}

/// call to fetch native balance
#[tauri::command]
pub async fn alchemy_fetch_native_balance(chain_id: u32, address: Address) -> Result<()> {
    Alchemy::read()
        .await
        .fetch_native_balance(chain_id, address)
        .await
}

#[tauri::command]
pub async fn alchemy_fetch_transactions(chain_id: u32, address: Address) -> Result<()> {
    Alchemy::read()
        .await
        .fetch_transactions(chain_id, address)
        .await
}
