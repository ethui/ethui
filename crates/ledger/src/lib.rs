#[cfg(test)]
mod tests {
    use ethers::signers::{HDPath, Ledger};

    #[tokio::test]
    async fn foo() -> anyhow::Result<()> {
        dbg!(HDPath::LedgerLive(0));
        let ledger = Ledger::new(HDPath::LedgerLive(0), 1).await?;
        dbg!(ledger);
        panic!("asd");

        Ok(())
    }
}
