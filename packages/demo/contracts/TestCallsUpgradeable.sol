// SPX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {TestCalls} from "./TestCalls.sol";
import {Initializable} from "@openzeppelin-upgradeable/proxy/utils/Initializable.sol";

contract TestCallsUpgradeable is TestCalls, Initializable {
    uint256 public x;

    function initialize() public initializer {
        x = 1;
    }


    function setX(uint256 _x) public {
        x = _x;
    }
}
