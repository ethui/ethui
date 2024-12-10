// SPDX-License-Identifier: MIT

// This example was adapted from the work of Emily Lin at https://trufflesuite.com/guides/nft-marketplace/

pragma solidity ^0.8.13;

import {ERC721} from "lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Strings} from "lib/openzeppelin-contracts/contracts/utils/Strings.sol";
import {Base64} from "lib/openzeppelin-contracts/contracts/utils/Base64.sol";

error InvalidArguments();

contract NFT is ERC721, ERC721Enumerable {
    //
    // State
    //

    /// keeps track of the next item's ID
    uint256 public currentId;

    /// Base URI for each item's image URI
    string baseImageURI;

    //
    // Constructor
    //
    constructor(string memory _baseImageURI) ERC721("POKEMON", "PKMN") {
        // ensure baseURI ends with a slash,
        // otherwise metadata will turn out wrong
        bytes memory b = bytes(_baseImageURI);
        if (b[b.length - 1] != bytes1("/")) {
            revert InvalidArguments();
        }

        baseImageURI = _baseImageURI;
    }

    //
    // Public API
    //
    function listTokensByAddress(address tokensOwner) public view returns (uint256[] memory) {
        uint256 totalAmount = balanceOf(tokensOwner);
        uint256[] memory totalTokens = new uint256[](totalAmount);
        for (uint256 i = 0; i < totalAmount; i++) {
            totalTokens[i] = tokenOfOwnerByIndex(tokensOwner, i);
        }
        return totalTokens;
    }

    function mint(address to) public {
        currentId += 1;
        uint256 newTokenId = currentId;
        _safeMint(to, newTokenId);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 id) public view override(ERC721) returns (string memory) {
        if (!_exists(id)) {
            revert InvalidArguments();
        }

        string memory idStr = Strings.toString(id);
        string memory paddedIdStr = idStr;

        if (id < 10) {
            paddedIdStr = string(abi.encodePacked("00", idStr));
        } else if (id < 100) {
            paddedIdStr = string(abi.encodePacked("0", idStr));
        }

        bytes memory dataURI = abi.encodePacked(
            "{",
            // id
            '"id":',
            idStr,
            ",",
            // name
            '"name":"',
            idStr,
            '",',
            // image
            '"image":"',
            baseImageURI,
            paddedIdStr,
            '.png"',
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(dataURI)));
    }

    //
    // ERC721Enumerable
    //
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        ERC721Enumerable._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return ERC721Enumerable.supportsInterface(interfaceId);
    }
}
