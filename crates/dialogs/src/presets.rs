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
            w: 1200.0,
            h: 900.0,
        },
    );

    presets.insert(
        "msg-sign".into(),
        Preset {
            title: "Sign Message".into(),
            w: 300.0,
            h: 400.0,
        },
    );

    presets.insert(
        "wallet-unlock".into(),
        Preset {
            title: "Wallet Unlock".into(),
            w: 400.0,
            h: 205.0,
        },
    );

    presets.insert(
        "chain-add".into(),
        Preset {
            title: "Add Network".into(),
            w: 400.0,
            h: 500.0,
        },
    );

    presets.insert(
        "chain-switch".into(),
        Preset {
            title: "Switch Network".into(),
            w: 400.0,
            h: 350.0,
        },
    );

    presets.insert(
        "erc20-add".into(),
        Preset {
            title: "Add ERC20".into(),
            w: 450.0,
            h: 400.0,
        },
    );

    presets.insert(
        "erc721-add".into(),
        Preset {
            title: "Add ERC721".into(),
            w: 450.0,
            h: 800.0,
        },
    );

    presets.insert(
        "erc1155-add".into(),
        Preset {
            title: "Add ERC1155".into(),
            w: 450.0,
            h: 800.0,
        },
    );

    presets
});
