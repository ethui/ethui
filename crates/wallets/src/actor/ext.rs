use color_eyre::Result;
use ethui_types::{Address, Json};
use kameo::actor::ActorRef;

use super::{
    AddressReply, Create, Find, Get, GetAll, GetAllAddresses, GetCurrent, GetCurrentAddress,
    GetWalletAddresses, Remove, SetCurrentPath, SetCurrentWallet, Update, WalletsActor,
};
use crate::Wallet;

#[allow(async_fn_in_trait)]
pub trait WalletsActorExt {
    // Read operations
    async fn get_all(&self) -> Result<Vec<Wallet>>;
    async fn get_current(&self) -> Result<Wallet>;
    async fn get_current_address(&self) -> Result<Address>;
    async fn get(&self, name: String) -> Result<Option<Wallet>>;
    async fn find(&self, address: Address) -> Result<Option<(Wallet, String)>>;
    async fn get_all_addresses(&self) -> Result<Vec<(String, Address)>>;
    async fn get_wallet_addresses(&self, name: String) -> Result<Vec<(String, Address)>>;

    // Write operations
    async fn create(&self, params: Json) -> Result<()>;
    async fn update(&self, name: String, params: Json) -> Result<()>;
    async fn remove(&self, name: String) -> Result<()>;
    async fn set_current_wallet(&self, idx: usize) -> Result<()>;
    async fn set_current_path(&self, key: String) -> Result<()>;
}

impl WalletsActorExt for ActorRef<WalletsActor> {
    async fn get_all(&self) -> Result<Vec<Wallet>> {
        Ok(self.ask(GetAll).await?)
    }

    async fn get_current(&self) -> Result<Wallet> {
        Ok(self.ask(GetCurrent).await?)
    }

    async fn get_current_address(&self) -> Result<Address> {
        Ok(self.ask(GetCurrentAddress).await?.0)
    }

    async fn get(&self, name: String) -> Result<Option<Wallet>> {
        Ok(self.ask(Get { name }).await?)
    }

    async fn find(&self, address: Address) -> Result<Option<(Wallet, String)>> {
        Ok(self
            .ask(Find {
                address: AddressReply(address),
            })
            .await?
            .0)
    }

    async fn get_all_addresses(&self) -> Result<Vec<(String, Address)>> {
        Ok(self.ask(GetAllAddresses).await?.0)
    }

    async fn get_wallet_addresses(&self, name: String) -> Result<Vec<(String, Address)>> {
        Ok(self.ask(GetWalletAddresses { name }).await?.0)
    }

    async fn create(&self, params: Json) -> Result<()> {
        Ok(self.tell(Create { params }).await?)
    }

    async fn update(&self, name: String, params: Json) -> Result<()> {
        Ok(self.tell(Update { name, params }).await?)
    }

    async fn remove(&self, name: String) -> Result<()> {
        Ok(self.tell(Remove { name }).await?)
    }

    async fn set_current_wallet(&self, idx: usize) -> Result<()> {
        Ok(self.tell(SetCurrentWallet { idx }).await?)
    }

    async fn set_current_path(&self, key: String) -> Result<()> {
        Ok(self.tell(SetCurrentPath { key }).await?)
    }
}
