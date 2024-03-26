use ethui_types::{events::Tx, Address, ToEthers, TokenMetadata, B256, U256, U64};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Balances {
    pub address: Address,
    pub token_balances: Vec<TokenBalance>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TokenBalance {
    pub contract_address: Address,
    pub token_balance: U256,
}

impl From<TokenBalance> for (Address, U256) {
    fn from(value: TokenBalance) -> Self {
        (value.contract_address, value.token_balance)
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemyAssetTransfer {
    pub block_num: U64,
    pub hash: B256,
    pub from: Address,
    pub to: Option<Address>,
    pub asset: Option<String>,
    pub category: String,
    pub raw_contract: AlchemyRawContract,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemyRawContract {
    pub address: Option<Address>,
    pub decimal: Option<U64>,
}

impl From<&AlchemyAssetTransfer> for Tx {
    fn from(value: &AlchemyAssetTransfer) -> Self {
        Self {
            hash: value.hash,
            block_number: Some(value.block_num.to_ethers().as_u64()),
            from: value.from,
            to: value.to,

            // Since these come from alchemy_getAssetTransfers, we presume the transaction status
            // to be 1 already (since a failed a tx would not finalize any transfers)
            status: 1,

            value: None,
            data: None,
            position: None,
            deployed_contract: None,
            gas_limit: None,
            gas_used: None,
            max_fee_per_gas: None,
            max_priority_fee_per_gas: None,
            r#type: None,
            nonce: None,

            incomplete: true,
        }
    }
}

impl TryFrom<&AlchemyAssetTransfer> for TokenMetadata {
    type Error = ();

    fn try_from(value: &AlchemyAssetTransfer) -> Result<Self, Self::Error> {
        if value.raw_contract.address.is_none() || value.asset.is_none() {
            return Err(());
        }

        Ok(Self {
            address: value.raw_contract.address.unwrap(),
            name: None,
            symbol: value.asset.clone(),
            decimals: value
                .raw_contract
                .decimal
                .map(|d| d.to_ethers().as_u32() as u8),
        })
    }
}
