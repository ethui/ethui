use std::collections::HashMap;

use once_cell::sync::Lazy;

#[derive(Debug)]
pub(super) struct Preset {
    pub title: String,
    pub w: f64,
    pub h: f64,
}

pub(super) static PRESETS: Lazy<HashMap<String, Preset>> = Lazy::new(|| {
    let mut presets = HashMap::new();
    presets.insert(
        "tx-review".into(),
        Preset {
            title: "Transaction Review".into(),
            w: 400.0,
            h: 220.0,
        },
    );

    presets.insert(
        "jsonkeystore-unlock".into(),
        Preset {
            title: "Jsonkeystore Unlock".into(),
            w: 400.0,
            h: 205.0,
        },
    );

    presets
});
