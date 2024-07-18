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
            w: 600.0,
            h: 600.0,
        },
    );

    presets.insert(
        "msg-sign".into(),
        Preset {
            title: "Sign Message".into(),
            w: 600.0,
            h: 600.0,
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
            title: "Add Chain".into(),
            w: 400.0,
            h: 500.0,
        },
    );

    presets.insert(
        "erc20token-add".into(),
        Preset {
            title: "Add ERC20 Token".into(),
            w: 400.0,
            h: 500.0,
        },
    );

    presets.insert(
        "erc721token-add".into(),
        Preset {
            title: "Add ERC721 Token".into(),
            w: 400.0,
            h: 500.0,
        },
    );

    presets.insert(
        "erc1155token-add".into(),
        Preset {
            title: "Add ERC1155 Token".into(),
            w: 400.0,
            h: 500.0,
        },
    );

    presets
});
