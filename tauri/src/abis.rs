use ethers::prelude::abigen;

abigen!(
    IERC20,
    r#"[
        event Transfer(address indexed from, address indexed to, uint256 value)
        event Approval(address indexed owner, address indexed spender, uint256 value)
    
        function name() public view returns (string)
        function symbol() public view returns (string)
        function decimals() public view returns (uint8)
    ]"#,
    event_derives(serde::Deserialize)
);

abigen!(
    ERC20Token,
    r#"[
    ]"#,
);

abigen!(
    IERC721,
    r#"[
        event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
    ]"#,
    event_derives(serde::Deserialize)
);
