pub mod actor;
pub mod commands;
mod init;
mod signer;
mod utils;
mod wallet;
pub(crate) mod wallets;

use ethui_types::Address;
pub use init::init;
pub use signer::Signer;

pub use self::wallet::{Wallet, WalletControl, WalletType};
pub use actor::{wallets, try_wallets, WalletsActor, WalletsActorExt};

pub async fn find_wallet(address: Address) -> Option<(Wallet, String)> {
    wallets().find(address).await.ok().flatten()
}

pub async fn get_current_wallet() -> Wallet {
    wallets().get_current().await.expect("wallets actor not initialized")
}
