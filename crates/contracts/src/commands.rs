use ethers::{
    etherscan::{contract::Metadata, Client},
    types::{Address, Chain},
};
use iron_db::{Error, Result, StoredContract, DB};

#[tauri::command]
pub async fn contracts_get_all(
    chain_id: u32,
    db: tauri::State<'_, DB>,
) -> Result<Vec<StoredContract>> {
    db.get_contracts(chain_id).await
}

#[tauri::command]
pub async fn contracts_insert_contract(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<()> {
    let chain = Chain::try_from(chain_id).map_err(|_| Error::InvalidChain)?;
    let metadata = fetch_abi(chain, address).await?.unwrap();

    let abi = Some(metadata.abi);
    let contract_name = Some(metadata.contract_name);

    // self.window_snd.send(UINotify::BalancesUpdated.into())?;
    // send ContractsUpdated event to UI using iron_broadcast

    db.insert_contract(chain_id, address, abi, contract_name)
        .await
}

async fn fetch_abi(chain: Chain, address: Address) -> Result<Option<Metadata>> {
    let api_key = std::env::var("ETHERSCAN_API_KEY")?;

    let client = Client::new(chain, api_key)?;
    let metadata = client.contract_source_code(address).await?;

    Ok(Some(metadata.items[0].clone()))
}
