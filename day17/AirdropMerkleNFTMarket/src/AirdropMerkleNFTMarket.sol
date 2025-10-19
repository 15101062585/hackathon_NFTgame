// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AirdropMerkleNFTMarket is Ownable {
    IERC20Permit public token;
    IERC721 public nft;
    
    bytes32 public merkleRoot;
    mapping(uint256 => uint256) public nftPrices;
    mapping(address => mapping(uint256 => bool)) public hasPurchased;
    uint256 public constant DISCOUNT_RATE = 50;
    
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTPurchased(address indexed buyer, uint256 indexed tokenId, uint256 price, uint256 discountedPrice);
    event MerkleRootUpdated(bytes32 newMerkleRoot);

    constructor(address _token, address _nft, bytes32 _merkleRoot, address initialOwner) 
        Ownable(initialOwner) 
    {
        token = IERC20Permit(_token);
        nft = IERC721(_nft);
        merkleRoot = _merkleRoot;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    function listNFT(uint256 tokenId, uint256 price) external {
        require(nft.ownerOf(tokenId) == msg.sender, "Not NFT owner");
        require(price > 0, "Price must be greater than 0");
        nftPrices[tokenId] = price;
        emit NFTListed(tokenId, price);
    }

    function permitPrePay(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        token.permit(owner, spender, value, deadline, v, r, s);
    }

    function claimNFT(uint256 tokenId, bytes32[] calldata proof) external {
        require(_verifyWhitelist(msg.sender, proof), "Not in whitelist");
        require(!hasPurchased[msg.sender][tokenId], "Already purchased");
        
        uint256 price = nftPrices[tokenId];
        require(price > 0, "NFT not listed");
        
        uint256 discountedPrice = (price * (100 - DISCOUNT_RATE)) / 100;
        hasPurchased[msg.sender][tokenId] = true;
        
        IERC20 erc20Token = IERC20(address(token));
        require(erc20Token.transferFrom(msg.sender, nft.ownerOf(tokenId), discountedPrice), "Token transfer failed");
        
        nft.safeTransferFrom(nft.ownerOf(tokenId), msg.sender, tokenId);
        emit NFTPurchased(msg.sender, tokenId, price, discountedPrice);
    }

    function _verifyWhitelist(address account, bytes32[] memory proof) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    function isWhitelisted(address account, bytes32[] calldata proof) external view returns (bool) {
        return _verifyWhitelist(account, proof);
    }

    function getDiscountedPrice(uint256 tokenId) external view returns (uint256 originalPrice, uint256 discountedPrice) {
        originalPrice = nftPrices[tokenId];
        discountedPrice = (originalPrice * (100 - DISCOUNT_RATE)) / 100;
    }
}