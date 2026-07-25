use alloy::{
    primitives::{Log, LogData},
    providers::{Provider as _, ProviderBuilder},
};
use ethui_simulator::*;
use ethui_types::prelude::*;

/// Simulates a WETH `approve()` call from a never-before-used address, forking
/// from the current chain head. Using a fresh address guarantees a cold
/// storage slot (deterministic gas), and forking at head avoids depending on
/// historical state that public RPC nodes eventually prune.
#[tokio::test(flavor = "multi_thread")]
async fn simulate_weth_approve() {
    let fork_url = "https://ethereum-rpc.publicnode.com".to_string();

    let provider = ProviderBuilder::new().connect(&fork_url).await.unwrap();
    let fork_block_number = Some(provider.get_block_number().await.unwrap());

    let weth = address!("C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    let from = address!("0000000000000000000000000000000000000001");
    let spender = address!("0000000000000000000000000000000000000002");
    let amount = U256::from(1);

    let mut data = vec![0x09, 0x5e, 0xa7, 0xb3]; // approve(address,uint256)
    data.extend_from_slice(spender.into_word().as_slice());
    data.extend_from_slice(&amount.to_be_bytes::<32>());

    let tx = Request {
        from,
        to: Some(weth),
        value: None,
        data: Some(Bytes::from(data)),
        gas_limit: 0,
    };

    let res = ethui_simulator::simulate_once(tx, fork_url, fork_block_number)
        .await
        .unwrap();

    assert!(res.success);
    assert_eq!(res.gas_used, 45764);
    assert_eq!(res.logs.len(), 1);
    assert_eq!(
        res.logs[0],
        Log {
            address: weth,
            data: LogData::new(
                vec![
                    B256::from_str(
                        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
                    )
                    .unwrap(),
                    from.into_word(),
                    spender.into_word(),
                ],
                Bytes::from(amount.to_be_bytes::<32>().to_vec())
            )
            .unwrap()
        }
    );
}
