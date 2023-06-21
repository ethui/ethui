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
    ERC20Token,
    r#"[
        function name() public view returns (string)
        function symbol() public view returns (string)
        function decimals() public view returns (uint8)
        function totalSupply() public view returns (uint256)
        function balanceOf(address _owner) public view returns (uint256 balance)
        function transfer(address _to, uint256 _value) public returns (bool success)
        function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)
        function approve(address _spender, uint256 _value) public returns (bool success)
        function allowance(address _owner, address _spender) public view returns (uint256 remaining)
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
