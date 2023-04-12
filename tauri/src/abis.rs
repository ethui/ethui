use ethers::prelude::abigen;

abigen!(
    IERC20,
    r#"[
        event Transfer(address indexed from, address indexed to, uint256 value)
        event Approval(address indexed owner, address indexed spender, uint256 value)
    ]"#,
    event_derives(serde::Deserialize)
);

abigen!(
    IERC721,
    r#"[
        event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
    ]"#,
    event_derives(serde::Deserialize)
);
