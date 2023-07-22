use ethers::core::types::Address;
use iron_types::{ChecksummedAddress, GlobalState};

use crate::{Alchemy, Error, Result};

/// call to fetch balances
#[tauri::command]
pub async fn alchemy_fetch_erc20_balances(
    chain_id: u32,
    address: ChecksummedAddress,
) -> Result<()> {
    let alchemy = Alchemy::read().await;

    handle_error(alchemy.fetch_erc20_balances(chain_id, address).await)
}

/// call to fetch native balance
#[tauri::command]
pub async fn alchemy_fetch_native_balance(chain_id: u32, address: Address) -> Result<()> {
    let alchemy = Alchemy::read().await;

    handle_error(alchemy.fetch_native_balance(chain_id, address).await)
}

#[tauri::command]
pub async fn alchemy_fetch_transactions(chain_id: u32, address: Address) -> Result<()> {
    let alchemy = Alchemy::read().await;

    handle_error(alchemy.fetch_transactions(chain_id, address).await)
}

pub fn handle_error(res: Result<()>) -> Result<()> {
    match res {
        Err(Error::UnsupportedChainId(_)) => Ok(()),
        e => e,
    }
}
