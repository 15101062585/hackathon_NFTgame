// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MemeFactory.sol";
import "../src/MemeToken.sol";

contract MemeFactoryTest is Test {
    MemeFactory public factory;
    address public projectTreasury = address(0x123);
    address public creator = address(0x456);
    address public minter = address(0x789);

    uint256 constant TOTAL_SUPPLY = 1000000 * 10 ** 18;
    uint256 constant PER_MINT = 1000 * 10 ** 18;
    uint256 constant PRICE = 0.001 ether;

    function setUp() public {
        vm.deal(creator, 10 ether);
        vm.deal(minter, 10 ether);
        factory = new MemeFactory(projectTreasury);
    }

    // 在测试文件中更新对 getTokenInfo 的调用
    function testDeployMeme() public {
        vm.startPrank(creator);

        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );

        // 验证代币部署成功
        assertTrue(factory.isMemeToken(memeToken));
        assertEq(factory.tokenCreators(memeToken), creator);

        // 使用新的信息获取函数
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

        vm.stopPrank();
    }

    function testMintMeme() public {
        vm.startPrank(creator);
        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );
        vm.stopPrank();

        vm.startPrank(minter);
        uint256 mintCost = PRICE * PER_MINT;

        // 铸造代币
        factory.mintMeme{value: mintCost}(memeToken);

        // 验证代币余额
        MemeToken token = MemeToken(memeToken);
        assertEq(token.balanceOf(minter), PER_MINT);
        assertEq(token.totalSupply(), PER_MINT);

        vm.stopPrank();
    }

    function testFeeDistribution() public {
        uint256 initialCreatorBalance = creator.balance;
        uint256 initialTreasuryBalance = projectTreasury.balance;

        vm.startPrank(creator);
        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );
        vm.stopPrank();

        vm.startPrank(minter);
        uint256 mintCost = PRICE * PER_MINT;
        factory.mintMeme{value: mintCost}(memeToken);
        vm.stopPrank();

        // 验证费用分配
        uint256 projectShare = mintCost / 100; // 1%
        uint256 creatorShare = mintCost - projectShare; // 99%

        assertEq(
            projectTreasury.balance - initialTreasuryBalance,
            projectShare
        );
        assertEq(creator.balance - initialCreatorBalance, creatorShare);
    }

    function testMintExceedsTotalSupply() public {
        vm.startPrank(creator);
        // 创建小供应量的代币用于测试
        address memeToken = factory.deployMeme(
            "TEST",
            PER_MINT * 2,
            PER_MINT,
            PRICE
        );
        vm.stopPrank();

        vm.startPrank(minter);
        uint256 mintCost = PRICE * PER_MINT;

        // 第一次铸造应该成功
        factory.mintMeme{value: mintCost}(memeToken);

        // 第二次铸造应该成功
        factory.mintMeme{value: mintCost}(memeToken);

        // 第三次铸造应该失败（超过总供应量）
        vm.expectRevert("Exceeds max supply");
        factory.mintMeme{value: mintCost}(memeToken);

        vm.stopPrank();
    }

    function testInsufficientPayment() public {
        vm.startPrank(creator);
        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );
        vm.stopPrank();

        vm.startPrank(minter);
        uint256 insufficientPayment = (PRICE * PER_MINT) - 1;

        vm.expectRevert("Insufficient payment");
        factory.mintMeme{value: insufficientPayment}(memeToken);

        vm.stopPrank();
    }

    function testRefundExcessPayment() public {
        vm.startPrank(creator);
        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );
        vm.stopPrank();

        vm.startPrank(minter);
        uint256 mintCost = PRICE * PER_MINT;
        uint256 excessPayment = mintCost + 0.1 ether;
        uint256 initialBalance = minter.balance;

        factory.mintMeme{value: excessPayment}(memeToken);

        // 验证多余的费用被退还
        assertEq(minter.balance, initialBalance - mintCost);

        vm.stopPrank();
    }

    function testMultipleMints() public {
        vm.startPrank(creator);
        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );
        vm.stopPrank();

        vm.startPrank(minter);
        uint256 mintCost = PRICE * PER_MINT;
        uint256 expectedTotalSupply = 0;

        for (uint256 i = 0; i < 5; i++) {
            factory.mintMeme{value: mintCost}(memeToken);
            expectedTotalSupply += PER_MINT;

            MemeToken token = MemeToken(memeToken);
            assertEq(token.totalSupply(), expectedTotalSupply);
            assertEq(token.balanceOf(minter), expectedTotalSupply);
        }

        vm.stopPrank();
    }

    function testCannotUseImplementationDirectly() public {
        address implementation = factory.memeTokenImplementation();
        MemeToken token = MemeToken(implementation);

        // 实现合约应该已经被禁用
        vm.expectRevert("Minting disabled");
        token.mint(minter, 1000);
    }

    function testGasComparison() public {
        vm.startPrank(creator);

        // 测试代理部署的Gas成本
        uint256 gasBefore = gasleft();
        address memeToken = factory.deployMeme(
            "TEST",
            TOTAL_SUPPLY,
            PER_MINT,
            PRICE
        );
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Proxy deployment gas used:", gasUsed);

        // 对比直接部署的Gas成本
        gasBefore = gasleft();
        address directToken = address(new MemeToken());
        uint256 directGasUsed = gasBefore - gasleft();

        console.log("Direct deployment gas used:", directGasUsed);
        console.log("Gas savings:", directGasUsed - gasUsed);

        assertTrue(gasUsed < directGasUsed, "Proxy should use less gas");

        vm.stopPrank();
    }
}
