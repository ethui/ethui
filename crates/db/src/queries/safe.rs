use ethui_types::{Address, SafeContractData};

use crate::{DbInner, Error, Result};

impl DbInner {
    pub async fn save_safe_contract_data(
        &self,
        owner: Address,
        chain_id: u32,
        data: SafeContractData,
    ) -> Result<()> {
        let contract = data.address.to_string();
        let owner = owner.to_string();
        let signers = serde_json::to_string(&data.owners).map_err(Error::Serde)?;
        let modules = serde_json::to_string(&data.modules).unwrap_or("".to_string());
        let master_copy = data.master_copy.to_string();
        let fallback_handler = data.fallback_handler.to_string();
        let guard = data.guard.to_string();

        sqlx::query!(
            r#" INSERT OR REPLACE INTO safe_contracts (contract, owner, chain_id, signers, threshold, nonce, modules, master_copy, fallback_handler, guard, version)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?) "#,
            contract,
            owner,
            chain_id,
            signers,
            data.threshold,
            data.nonce,
            modules,
            master_copy,
            fallback_handler,
            guard,
            data.version,
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
