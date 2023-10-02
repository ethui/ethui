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
        function name() public view returns (string)
        function symbol() public view returns (string)
        function tokenURI(uint256 tokenId) public view returns (string)
    ]"#,
    event_derives(serde::Deserialize)
);

abigen!(
    AggregatorV3Interface,
    r#"[
        function decimals() external view returns (uint8)
        function description() external view returns (string memory)
        function version() external view returns (uint256)
        function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
        function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    ]"#,
    event_derives(serde::Deserialize)
);
