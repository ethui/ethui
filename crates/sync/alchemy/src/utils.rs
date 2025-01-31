use ethui_types::GlobalState;

use crate::{Alchemy, Error, Result};

pub async fn get_current_api_key() -> Result<Option<String>> {
    let settings = ethui_settings::Settings::read().await;

    Ok(settings
        .inner
        .alchemy_api_key
        .as_ref()
        .cloned()
        .filter(|s| !s.is_empty()))
}

pub async fn get_alchemy(chain_id: u32) -> Result<Alchemy> {
    let api_key = match get_current_api_key().await {
        Ok(Some(api_key)) => api_key,
        _ => return Err(Error::NoAPIKey),
    };
    let alchemy = Alchemy::new(&api_key, ethui_db::get(), chain_id).unwrap();

    Ok(alchemy)
}
