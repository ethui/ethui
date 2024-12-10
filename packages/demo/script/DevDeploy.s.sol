// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "lib/forge-std/src/Script.sol";

import {NFT} from "contracts/NFT.sol";
import {Token} from "contracts/Token.sol";
import {TestCalls} from "contracts/TestCalls.sol";

contract DevDeployScript is Script {
    address alice = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address bob = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    address carol = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address dave = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
    address ledger = address(0x4b7f6bfD248f541eB5474f591D54Bc29444946db);
    address ledger2 = address(0xA215c23e89B521Db023e19F77263ADEE21e8131F);
    address metamaskTest = address(0x0077014b4C74d9b1688847386B24Ed23Fdf14Be8);

    address[] testAccounts;

    function setUp() public {
        testAccounts = new address[](7);
        testAccounts[0] = alice;
        testAccounts[1] = bob;
        testAccounts[2] = carol;
        testAccounts[3] = dave;
        testAccounts[4] = ledger;
        testAccounts[5] = ledger2;
        testAccounts[6] = metamaskTest;
    }

    function run() public {
        vm.startBroadcast();
        NFT nft = new NFT("https://assets.pokemon.com/assets/cms2/img/pokedex/detail/");
        Token token = new Token();
        TestCalls testCalls = new TestCalls();

        for (uint256 i = 0; i < testAccounts.length; i++) {
            address addr = testAccounts[i];
            (bool success,) = addr.call{value: 10 ether}("");
            require(success, "transfer failed");

            nft.mint(addr);
            token.mint(addr, 100 ether);
        }

        vm.stopBroadcast();
    }
}
