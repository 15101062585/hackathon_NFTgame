// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// 由于在包里未找到该类，推测可能需要安装依赖，若已安装请确认 OpenZeppelin 版本是否兼容。
// 以下使用 OpenZeppelin 4.x 版本标准路径引入 Counters
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNft is ERC721URIStorage{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
    constructor() ERC721(unicode"大理NFT","scenery"){

    }
    //铸造nft
    function mint(address to,string memory tokenURI) public returns (uint256){
        //ntf数量+1;
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(to,newItemId);
        _setTokenURI(newItemId,tokenURI);
        return newItemId;

    }

    
}