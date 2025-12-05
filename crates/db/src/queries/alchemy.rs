// use ethui_types::alchemy::AlchemyAssetTransfer;
// use ethui_types::ToEthers;
//
// use crate::DbInner;
//
// impl Db {
//     pub async fn save_alchemy_transfers(
//         &self,
//         chain_id: u64,
//         transfers: Vec<AlchemyAssetTransfer>,
//     ) -> color_eyre::Result<()> {
//         for transfer in transfers {
//             let hash = format!("0x{:x}", transfer.hash);
//             let from = format!("0x{:x}", transfer.from);
//             let to = transfer.to.map(|a| format!("0x{:x}", a));
//             let block_number = transfer.block_num.to_ethers().as_u64() as i64;
//
//             sqlx::query!(
//                 r#" INSERT INTO transactions (hash, chain_id, from_address, to_address, block_number, status)
//                     VALUES (?,?,?,?,?, 1)
//                     ON CONFLICT(hash) DO NOTHING "#,
//                 hash,
//                 chain_id,
//                 from,
//                 to,
//                 block_number
//             )
//             .execute(self.pool()).await?;
//
//             // if let Some(address) = transfer.raw_contract.address {
//             //     let contract = address.to_string();
//             //     let decimals = transfer.raw_contract.decimal.to_ethers().as_u64() as u32;
//             //
//             //     sqlx::query!(
//             //         r#"INSERT INTO tokens_metadata
//             //             (chain_id, contract, decimals, symbol)
//             //             VALUES (?, ?, ?, ?)
//             //             ON CONFLICT(chain_id, contract) DO NOTHING"#,
//             //         chain_id,
//             //         contract,
//             //         decimals,
//             //         transfer.asset
//             //     )
//             //     .execute(self.pool())
//             //     .await?;
//             // }
//         }
//
//         Ok(())
//     }
// }
