use ethui_types::{Address, SafeContractData, SafeMultisigTxData};

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

    pub async fn read_safe_contract_nonce(&self, contract: Address, chain_id: u32) -> Result<u32> {
        let contract = contract.to_string();

        let row = sqlx::query!(
            r#"SELECT nonce FROM safe_contracts WHERE contract = ? AND chain_id = ?"#,
            contract,
            chain_id,
        )
        .fetch_one(self.pool())
        .await?;

        let nonce: u32 = row.nonce.unwrap_or(0) as u32;

        Ok(nonce)
    }

    pub async fn clear_safe_contract_data(&self, owner: Address, chain_id: u32) -> Result<()> {
        let owner = owner.to_string();

        sqlx::query!(
            r#"DELETE FROM safe_contracts WHERE owner = ? AND chain_id = ?"#,
            owner,
            chain_id,
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn save_safe_pending_tx(
        &self,
        owner: Address,
        chain_id: u32,
        _data: SafeMultisigTxData,
    ) -> Result<()> {
        let contract = _data.safe.to_string();
        let owner = owner.to_string();
        let confirmations_owners: Vec<String> = _data
            .confirmations
            .iter()
            .map(|confirmation| confirmation.owner.to_string())
            .collect();
        let confirmations = serde_json::to_string(&confirmations_owners)?;
        let safe_tx_hash = _data.safe_tx_hash.to_string();
        let to = _data.to.to_string();
        let proposer = _data.proposer.map(|p| p.to_string());

        sqlx::query!(
        r#" INSERT OR REPLACE INTO safe_pending_transactions (contract, owner, chain_id, nonce, confirmations, safe_tx_hash, "to", data, proposer, is_executed, is_successful, confirmations_required)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"#,
            contract,
            owner,
            chain_id,
            _data.nonce,
            confirmations,
            safe_tx_hash,
            to,            
            _data.data,
            proposer,
            _data.is_executed,
            _data.is_successful,
            _data.confirmations_required,
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn clean_safe_executed_txs(&self, chain_id: u32) -> Result<()> {
        sqlx::query!(
            r#"DELETE FROM safe_pending_transactions WHERE chain_id = ? AND is_executed = true"#,
            chain_id,
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
