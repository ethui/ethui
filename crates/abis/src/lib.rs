use alloy::sol;

sol! {
    #[sol(rpc)]
    contract IERC20 {
        event Transfer(address indexed from, address indexed to, uint256 value);
        event Approval(address indexed owner, address indexed spender, uint256 value);
        function name() public view returns (string name);
        function symbol() public view returns (string symbol);
        function decimals() public view returns (uint8 decimals);
    }
}

sol! {
    #[sol(rpc)]
    contract IERC721 {
        event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
        event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
        function name() public view returns (string name);
        function symbol() public view returns (string symbol);
    }

    #[sol(rpc)]
    contract IERC721WithMetadata is IERC721 {
        function tokenURI(uint256 tokenId) public view returns (string uri);
    }
}
