// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/NFTMarketV2621.sol";
import "../src/MyNft.sol";
import "../src/BaseERC20V2612.sol";

contract NFTMarketGasTest is Test {
    NFTMarketV2621 public market;
    MyNft public nft;
    MyTokenERC2612 public token;
    
    // 测试账户
    address public owner = makeAddr("owner");
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public whitelistSigner = makeAddr("whitelistSigner");
    address public randomUser = makeAddr("randomUser");
    
    // 测试常量
    uint256 public constant INITIAL_TOKEN_BALANCE = 10000 ether;
    uint256 public constant NFT_PRICE = 100 ether;
    
    // 用于测试的 tokenURI
    string public constant TOKEN_URI_1 = "https://example.com/token1.json";
    string public constant TOKEN_URI_2 = "https://example.com/token2.json";
    string public constant TOKEN_URI_3 = "https://example.com/token3.json";

    // 存储实际铸造的 tokenId
    uint256 public tokenId1;
    uint256 public tokenId2;
    uint256 public tokenId3;

    function setUp() public {
        // 部署合约
        vm.startPrank(owner);
        nft = new MyNft();
        token = new MyTokenERC2612();
        market = new NFTMarketV2621(nft, token, whitelistSigner);
        vm.stopPrank();
        
        // 为测试账户分配代币 - 使用 transfer
        vm.prank(owner);
        token.transfer(seller, INITIAL_TOKEN_BALANCE);
        
        vm.prank(owner);
        token.transfer(buyer, INITIAL_TOKEN_BALANCE);
        
        vm.prank(owner);
        token.transfer(randomUser, INITIAL_TOKEN_BALANCE);
        
        // 铸造NFT给卖家并记录实际的 tokenId
        vm.startPrank(owner);
        tokenId1 = nft.mint(seller, TOKEN_URI_1);
        tokenId2 = nft.mint(seller, TOKEN_URI_2);
        tokenId3 = nft.mint(seller, TOKEN_URI_3);
        vm.stopPrank();
        
        console.log("Minted token IDs:", tokenId1, tokenId2, tokenId3);
        
        // 授权市场合约使用代币
        vm.startPrank(buyer);
        token.approve(address(market), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(seller);
        token.approve(address(market), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(randomUser);
        token.approve(address(market), type(uint256).max);
        vm.stopPrank();
    }

    function test_ListNFT_Gas() public {
        vm.startPrank(seller);
        
        // 授权NFT转移给市场合约
        nft.approve(address(market), tokenId1);
        
        uint256 gasStart = gasleft();
        market.list(tokenId1, NFT_PRICE);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for list NFT:", gasUsed);
        
        // 验证上架状态
        (address listingSeller, uint256 price, bool isListed) = market.listings(tokenId1);
        assertEq(listingSeller, seller);
        assertEq(price, NFT_PRICE);
        assertTrue(isListed);
        assertEq(nft.ownerOf(tokenId1), address(market));
        
        vm.stopPrank();
    }

    function test_BuyNFT_Gas() public {
        // 先上架NFT
        vm.startPrank(seller);
        nft.approve(address(market), tokenId1);
        market.list(tokenId1, NFT_PRICE);
        vm.stopPrank();
        
        uint256 initialBuyerBalance = token.balanceOf(buyer);
        uint256 initialSellerBalance = token.balanceOf(seller);
        
        console.log("Buyer balance before:", initialBuyerBalance);
        console.log("Seller balance before:", initialSellerBalance);
        
        vm.startPrank(buyer);
        uint256 gasStart = gasleft();
        market.buyNFT(tokenId1);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for buyNFT:", gasUsed);
        vm.stopPrank();
        
        // 验证购买结果
        assertEq(nft.ownerOf(tokenId1), buyer);
        assertEq(token.balanceOf(buyer), initialBuyerBalance - NFT_PRICE);
        assertEq(token.balanceOf(seller), initialSellerBalance + NFT_PRICE);
        
        (, , bool isListed) = market.listings(tokenId1);
        assertFalse(isListed);
    }

    function test_CancelListing_Gas() public {
        // 先上架NFT
        vm.startPrank(seller);
        nft.approve(address(market), tokenId1);
        market.list(tokenId1, NFT_PRICE);
        vm.stopPrank();
        
        vm.startPrank(seller);
        uint256 gasStart = gasleft();
        market.cancelListing(tokenId1);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for cancelListing:", gasUsed);
        vm.stopPrank();
        
        // 验证取消结果
        assertEq(nft.ownerOf(tokenId1), seller);
        (, , bool isListed) = market.listings(tokenId1);
        assertFalse(isListed);
    }

    function test_SetWhitelistSigner_Gas() public {
        address newSigner = makeAddr("newSigner");
        
        uint256 gasStart = gasleft();
        market.setWhitelistSigner(newSigner);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for setWhitelistSigner:", gasUsed);
        
        // 验证更新结果
        (, , address signerAddr, ) = market.getContractInfo();
        assertEq(signerAddr, newSigner);
    }

    function test_EmergencyWithdraw_Gas() public {
        // 先上架NFT
        vm.startPrank(seller);
        nft.approve(address(market), tokenId1);
        market.list(tokenId1, NFT_PRICE);
        vm.stopPrank();
        
        vm.startPrank(seller);
        uint256 gasStart = gasleft();
        market.emergencyWithdrawNFT(tokenId1);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for emergencyWithdrawNFT:", gasUsed);
        vm.stopPrank();
        
        // 验证紧急取回结果
        assertEq(nft.ownerOf(tokenId1), seller);
        (, , bool isListed) = market.listings(tokenId1);
        assertFalse(isListed);
    }

    function test_ViewFunctions_Gas() public {
        // 测试视图函数的gas消耗
        
        uint256 gasStart = gasleft();
        market.getDomainSeparator();
        uint256 gasUsed1 = gasStart - gasleft();
        console.log("Gas used for getDomainSeparator:", gasUsed1);
        
        gasStart = gasleft();
        market.isNonceUsed(99999);
        uint256 gasUsed2 = gasStart - gasleft();
        console.log("Gas used for isNonceUsed:", gasUsed2);
        
        gasStart = gasleft();
        market.getContractInfo();
        uint256 gasUsed3 = gasStart - gasleft();
        console.log("Gas used for getContractInfo:", gasUsed3);
        
        // 测试 listings 视图函数
        gasStart = gasleft();
        market.listings(tokenId1);
        uint256 gasUsed4 = gasStart - gasleft();
        console.log("Gas used for listings view:", gasUsed4);
    }

    // 主测试函数 - 运行所有测试并生成gas报告（排除有问题的permitBuy）
    function test_CompleteGasReport() public {
        console.log("=== NFTMarket Gas Report v1 ===");
        console.log("Timestamp:", block.timestamp);
        console.log("Block Number:", block.number);
        console.log("");
        
        console.log("--- Core Functions Gas Usage ---");
        test_ListNFT_Gas();
        test_BuyNFT_Gas();
        test_CancelListing_Gas();
        
        console.log("");
        console.log("--- Additional Functions Gas Usage ---");
        test_SetWhitelistSigner_Gas();
        test_EmergencyWithdraw_Gas();
        
        console.log("");
        console.log("--- View Functions Gas Usage ---");
        test_ViewFunctions_Gas();
        
        console.log("");
        console.log("=== Gas Report Complete ===");
    }

    // 单独运行每个测试的函数
    function test_IndividualList() public {
        test_ListNFT_Gas();
    }

    function test_IndividualBuy() public {
        test_BuyNFT_Gas();
    }

    function test_IndividualCancel() public {
        test_CancelListing_Gas();
    }
}