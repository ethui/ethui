pub fn get_asset_match(base_asset: String, quote_asset: String) -> (String, String) {
    let base_asset = match base_asset.as_str() {
        "WETH" => "ETH".to_string(),
        "WBTC" => "BTC".to_string(),
        "MATIC" => "POL".to_string(),
        _ => base_asset,
    };

    let quote_asset = match quote_asset.as_str() {
        "WETH" => "ETH".to_string(),
        "WBTC" => "BTC".to_string(),
        "MATIC" => "POL".to_string(),
        _ => quote_asset,
    };

    (base_asset, quote_asset)
}
