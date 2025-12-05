use serde_json::json;

#[derive(serde::Deserialize, Debug)]
struct GetChainIdResponse {
    result: String,
}

pub async fn get_chain_id(rpc_url: &str) -> color_eyre::Result<u64> {
    let client = reqwest::Client::new();
    let response = client
        .post(rpc_url)
        .json(&json!({
            "jsonrpc": "2.0",
            "method": "eth_chainId",
            "params": [],
            "id": 1
        }))
        .send()
        .await;

    let result: GetChainIdResponse = response?.json().await?;

    let chain_id = u64::from_str_radix(&result.result[2..], 16)?;
    Ok(chain_id)
}

pub async fn check_stack_online(rpc_url: &str) -> Result<bool, Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()?;

    let response = client
        .post(rpc_url)
        .json(&json!({
            "jsonrpc": "2.0",
            "method": "eth_chainId",
            "params": [],
            "id": 1
        }))
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let result: serde_json::Value = resp.json().await?;
                Ok(result["result"].is_string())
            } else {
                Ok(false)
            }
        }
        Err(_) => Ok(false),
    }
}
