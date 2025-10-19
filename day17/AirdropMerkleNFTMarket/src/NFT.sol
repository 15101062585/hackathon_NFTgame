// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    constructor(string memory baseURI) 
        ERC721("TestNFT", "TNFT") 
        Ownable(msg.sender)
    {
        _baseTokenURI = baseURI;
    }

    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function mintBatch(address to, uint256 count) public onlyOwner {
        for (uint256 i = 0; i < count; i++) {
            mint(to);
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}