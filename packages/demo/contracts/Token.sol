// SPDX-License-Identifier: MIT

// This example was adapted from the work of Emily Lin at https://trufflesuite.com/guides/nft-marketplace/

pragma solidity ^0.8.13;

import {ERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20("TestToken", "TEST") {
    constructor() {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
