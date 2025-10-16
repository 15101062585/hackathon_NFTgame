// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MemeFactory.sol";

contract MemeFactoryTest is Test {
    MemeFactory public factory;
    
    address projectTreasury = address(0x123);
    address creator = address(0x456);
    address minter = address(0x789);
    
    // 使用更合理的数值
    uint256 constant TOTAL_SUPPLY = 1_000_000 * 1e18;  // 100万代币
    uint256 constant PER_MINT = 1_000 * 1e18;          // 每次铸造1000代币
    uint256 constant PRICE = 0.001 ether;              // 每个代币0.001 ETH

    function setUp() public {
        vm.deal(creator, 10 ether);
        vm.deal(minter, 10 ether);
        factory = new MemeFactory(projectTreasury);
    }

    function testDeployMeme() public {
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        assertTrue(factory.isMemeToken(memeToken));
        assertEq(factory.tokenCreators(memeToken), creator);
    }

    function testMintMeme() public {
        // 部署
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        MemeToken token = MemeToken(memeToken);
        
        // 计算铸造成本
        uint256 mintCost = PRICE * (PER_MINT / 1e18); // 0.001 ETH * 1000 = 1 ETH
        
        // 铸造
        vm.prank(minter);
        factory.mintMeme{value: mintCost}(memeToken);
        
        // 验证
        assertEq(token.balanceOf(minter), PER_MINT);
        assertEq(token.totalSupply(), PER_MINT);
    }

    function testFeeDistribution() public {
        // 部署
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        uint256 initialTreasuryBalance = projectTreasury.balance;
        uint256 initialCreatorBalance = creator.balance;
        
        // 计算铸造成本
        uint256 mintCost = PRICE * (PER_MINT / 1e18); // 1 ETH
        
        // 铸造
        vm.prank(minter);
        factory.mintMeme{value: mintCost}(memeToken);
        
        // 验证费用分配
        uint256 projectShare = mintCost / 100;        // 0.01 ETH (1%)
        uint256 creatorShare = mintCost - projectShare; // 0.99 ETH (99%)
        
        assertEq(projectTreasury.balance - initialTreasuryBalance, projectShare);
        assertEq(creator.balance - initialCreatorBalance, creatorShare);
    }

    function testMintExceedsTotalSupply() public {
        // 部署小供应量代币
        uint256 smallSupply = PER_MINT * 2; // 只能铸造2次
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", smallSupply, PER_MINT, PRICE);
        
        uint256 mintCost = PRICE * (PER_MINT / 1e18);
        
        // 第一次铸造
        vm.prank(minter);
        factory.mintMeme{value: mintCost}(memeToken);
        
        // 第二次铸造
        vm.prank(minter);
        factory.mintMeme{value: mintCost}(memeToken);
        
        // 第三次铸造应该失败
        vm.prank(minter);
        vm.expectRevert("Exceeds total supply");
        factory.mintMeme{value: mintCost}(memeToken);
    }

    function testInsufficientPayment() public {
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        uint256 mintCost = PRICE * (PER_MINT / 1e18);
        uint256 insufficientPayment = mintCost - 1; // 少付1 wei
        
        vm.prank(minter);
        vm.expectRevert("Insufficient payment");
        factory.mintMeme{value: insufficientPayment}(memeToken);
    }

    function testRefundExcessPayment() public {
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        uint256 mintCost = PRICE * (PER_MINT / 1e18);
        uint256 excessPayment = mintCost + 0.1 ether;
        uint256 initialBalance = minter.balance;
        
        vm.prank(minter);
        factory.mintMeme{value: excessPayment}(memeToken);
        
        // 验证退款
        assertEq(minter.balance, initialBalance - mintCost);
    }

    function testMultipleMints() public {
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        uint256 mintCost = PRICE * (PER_MINT / 1e18);
        
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(minter);
            factory.mintMeme{value: mintCost}(memeToken);
            
            MemeToken token = MemeToken(memeToken);
            uint256 expectedSupply = PER_MINT * (i + 1);
            assertEq(token.totalSupply(), expectedSupply);
            assertEq(token.balanceOf(minter), expectedSupply);
        }
    }

    function testTokenInfo() public {
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        (
            string memory name,
            string memory symbol,
            uint256 totalSupply,
            uint256 maxSupply,
            uint256 perMint,
            uint256 price,
            bool mintingEnabled,
            address tokenCreator
        ) = factory.getTokenInfo(memeToken);
        
        assertEq(name, "Meme TEST");
        assertEq(symbol, "TEST");
        assertEq(totalSupply, 0);
        assertEq(maxSupply, TOTAL_SUPPLY);
        assertEq(perMint, PER_MINT);
        assertEq(price, PRICE);
        assertTrue(mintingEnabled);
        assertEq(tokenCreator, creator);
    }

    function testCannotMintWhenDisabled() public {
        vm.prank(creator);
        address memeToken = factory.deployMeme("TEST", TOTAL_SUPPLY, PER_MINT, PRICE);
        
        // 禁用铸造
        MemeToken token = MemeToken(memeToken);
        vm.prank(creator);
        token.disableMinting();
        
        uint256 mintCost = PRICE * (PER_MINT / 1e18);
        vm.prank(minter);
        vm.expectRevert("Minting disabled");
        factory.mintMeme{value: mintCost}(memeToken);
    }
}