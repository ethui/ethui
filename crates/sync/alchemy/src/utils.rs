use ethui_settings::{ask, GetSettings};
use ethui_types::eyre;

use crate::Alchemy;

pub async fn get_current_api_key() -> color_eyre::Result<Option<String>> {
    let settings = ask(GetSettings).await.map_err(|e| eyre!("Failed to get settings: {}", e))?;

    Ok(settings
        .alchemy_api_key
        .as_ref()
        .cloned()
        .filter(|s| !s.is_empty()))
}

pub async fn get_alchemy(chain_id: u32) -> color_eyre::Result<Alchemy> {
    let api_key = match get_current_api_key().await {
        Ok(Some(api_key)) => api_key,
        _ => return Err(eyre!("Alchemy API Key not found")),
    };
    let alchemy = Alchemy::new(&api_key, ethui_db::get(), chain_id).unwrap();

    Ok(alchemy)
}
