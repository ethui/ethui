pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";

contract TestCalls {
    struct Struct {
        string n;
        uint256 v;
    }

    struct Struct2 {
        address a;
        Struct s;
    }

    uint256[] public uintArray;

    function call_empty() external {}
    function call_uint(uint256 v) external {}

    function pay(uint256 v) external payable {}

    function call_string(string calldata v) external {}

    function call_bytes32(bytes32 v) external {}
    function call_bytes(bytes calldata v) external {}
    function call_struct(Struct calldata v) external {}
    function call_nestedStruct(Struct2 calldata v) external {}

    function call_uintArray(uint256[] calldata v) external {
        console.log("call_uintArray", v.length);
        console.log("call_uintArray", v[0]);
        uintArray = v;
    }

    function call_uintNestedArray(uint256[][] calldata v) external {}

    function call_uintArraySpecificLength(uint256[2] calldata v) external {}

    function length_uintArry() external view returns (uint256) {
        return 10;
    }

    function call_stringArray(string[] calldata v) external {}
    function call_bytes32Array(bytes[] calldata v) external {}
    function call_bytesArray(bytes32[] calldata v) external {}

    function buy(uint256 _amount, string[] calldata _proof) external {}
    function two(uint256 x, uint256 y) external {}

    fallback() external {}
}
