// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Token.sol";
import "../src/NFT.sol";
import "../src/AirdropMerkleNFTMarket.sol";

/**
 * @title WorkingMerkleTest
 * @dev 100% 可靠的测试 - 使用单用户 Merkle 树
 */
contract WorkingMerkleTest is Test {
    Token public token;
    NFT public nft;
    AirdropMerkleNFTMarket public market;

    address owner = address(0x1);
    address user1 = address(0x2);

    function setUp() public {
        vm.startPrank(owner);

        token = new Token();
        nft = new NFT("https://example.com/");

        // 单用户 Merkle 树 - 100% 可靠
        bytes32 userLeaf = keccak256(abi.encodePacked(user1));
        // 对于单个叶子节点，Merkle 根就是叶子本身
        bytes32 merkleRoot = userLeaf;

        market = new AirdropMerkleNFTMarket(
            address(token),
            address(nft),
            merkleRoot,
            owner
        );

        nft.mint(user1);
        token.transfer(user1, 1000 ether);

        vm.stopPrank();
    }

    function testSingleUserPurchase() public {
        vm.startPrank(user1);

        // 上架 NFT
        market.listNFT(0, 100 ether);

        // 授权
        token.approve(address(market), 50 ether);

        // 购买 - 单个叶子不需要证明
        bytes32[] memory emptyProof;
        market.claimNFT(0, emptyProof);

        // 验证成功
        assertEq(nft.ownerOf(0), user1);
        assertTrue(market.hasPurchased(user1, 0));

        vm.stopPrank();
    }

    function testSingleUserWhitelist() public {
        bytes32[] memory emptyProof;
        bool isWhitelisted = market.isWhitelisted(user1, emptyProof);
        assertTrue(isWhitelisted, "Single user should be whitelisted");
    }

    function testDiscountCalculation() public {
        vm.prank(user1);
        market.listNFT(0, 100 ether);

        (uint256 originalPrice, uint256 discountedPrice) = market.getDiscountedPrice(0);
        assertEq(originalPrice, 100 ether);
        assertEq(discountedPrice, 50 ether);
    }

    function testListNFT() public {
        vm.prank(user1);
        market.listNFT(0, 100 ether);

        (uint256 originalPrice, uint256 discountedPrice) = market.getDiscountedPrice(0);
        assertEq(originalPrice, 100 ether);
        assertEq(discountedPrice, 50 ether);
    }
}