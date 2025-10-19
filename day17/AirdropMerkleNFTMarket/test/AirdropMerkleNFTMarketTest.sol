// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Token.sol";
import "../src/NFT.sol";
import "../src/AirdropMerkleNFTMarket.sol";
import "../src/Multicall.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract AirdropMerkleNFTMarketTest is Test {
    Token public token;
    NFT public nft;
    AirdropMerkleNFTMarket public market;
    Multicall public multicall;

    // 使用完整的地址格式，与 JavaScript 完全一致
    address owner = 0x0000000000000000000000000000000000000001;
    address user1 = 0x0000000000000000000000000000000000000002;
    address user2 = 0x0000000000000000000000000000000000000003;
    address user3 = 0x0000000000000000000000000000000000000004;

    // 使用 JavaScript 生成的正确 Merkle 数据
    bytes32 public constant MERKLE_ROOT = 0x5071e19149cc9b870c816e671bc5db717d1d99185c17b082af957a0a93888dd9;
    
    bytes32[] public user1Proof;
    bytes32[] public user2Proof;

    function setUp() public {
        vm.startPrank(owner);

        token = new Token();
        nft = new NFT("https://example.com/");
        multicall = new Multicall();

        // 设置正确的 Merkle 证明（根据 JavaScript 输出）
        _setupMerkleProofs();

        // 验证证明在部署前就正确
        _verifyMerkleProofs();

        market = new AirdropMerkleNFTMarket(
            address(token),
            address(nft),
            MERKLE_ROOT,
            owner
        );

        nft.mintBatch(user1, 3);
        nft.mintBatch(user2, 2);

        token.transfer(user1, 1000 ether);
        token.transfer(user2, 1000 ether);
        token.transfer(user3, 1000 ether);

        vm.stopPrank();
    }

    /**
     * @dev 设置 Merkle 证明 - 使用 JavaScript 生成的精确数据
     */
    function _setupMerkleProofs() internal {
        // User1 Proof (address 0x0000000000000000000000000000000000000002)
        user1Proof = new bytes32[](2);
        user1Proof[0] = 0x1468288056310c82aa4c01a7e12a10f8111a0560e72b700555479031b86c357d;
        user1Proof[1] = 0x735c77c52a2b69afcd4e13c0a6ece7e4ccdf2b379d39417e21efe8cd10b5ff1b;

        // User2 Proof (address 0x0000000000000000000000000000000000000003)
        user2Proof = new bytes32[](2);
        user2Proof[0] = 0xa876da518a393dbd067dc72abfa08d475ed6447fca96d92ec3f9e7eba503ca61;
        user2Proof[1] = 0xf95c14e6953c95195639e8266ab1a6850864d59a829da9f9b13602ee522f672b;
    }

    /**
     * @dev 验证 Merkle 证明
     */
    function _verifyMerkleProofs() internal view {
        bytes32 user1Leaf = keccak256(abi.encodePacked(user1));
        bytes32 user2Leaf = keccak256(abi.encodePacked(user2));
        
        bool user1Valid = MerkleProof.verify(user1Proof, MERKLE_ROOT, user1Leaf);
        bool user2Valid = MerkleProof.verify(user2Proof, MERKLE_ROOT, user2Leaf);
        
        require(user1Valid, "User1 proof invalid");
        require(user2Valid, "User2 proof invalid");
        
        console.log(" All Merkle proofs are valid!");
    }

    function testMerkleVerification() public view {
        assertTrue(market.isWhitelisted(user1, user1Proof), "User1 should be whitelisted");
        assertTrue(market.isWhitelisted(user2, user2Proof), "User2 should be whitelisted");
        
        bytes32[] memory emptyProof;
        assertFalse(market.isWhitelisted(user3, emptyProof), "User3 should not be whitelisted");
        
        console.log(" Merkle verification tests passed");
    }

    function testNFTPurchase() public {
        vm.startPrank(user1);
        
        // user1 上架 NFT
        market.listNFT(0, 100 ether);
        console.log(" NFT listed by user1");
        
        // 关键修复：授权 NFT 给市场合约
        nft.approve(address(market), 0);
        console.log(" NFT approved for market");
        
        vm.stopPrank();
        
        vm.startPrank(user2);
        
        // 授权 token 给市场合约
        token.approve(address(market), 50 ether);
        console.log(" Token approved for market");
        
        // 购买 NFT
        market.claimNFT(0, user2Proof);
        console.log(" NFT purchased by user2");
        
        // 验证
        assertEq(nft.ownerOf(0), user2, "NFT should be transferred to user2");
        assertTrue(market.hasPurchased(user2, 0), "Purchase should be recorded");
        
        console.log(" NFT purchase verification passed");
        
        vm.stopPrank();
    }

    function testMulticallPurchase() public {
        vm.startPrank(user1);
        
        // user1 上架 NFT
        market.listNFT(0, 100 ether);
        console.log(" NFT listed by user1");
        
        // 关键修复：授权 NFT 给市场合约
        nft.approve(address(market), 0);
        console.log(" NFT approved for market");
        
        vm.stopPrank();
        
        vm.startPrank(user2);
        
        // 首先直接授权 token，确保有足够的余额
        token.approve(address(market), 50 ether);
        console.log(" Token pre-approved for market");
        
        // 准备 permit 数据 - 修复签名问题
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(user2);
        
        console.log("User2 nonce:", nonce);
        console.log("Token address:", address(token));
        console.log("Market address:", address(market));
        
        // 正确的 permit 哈希构建
        bytes32 TYPE_HASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash = keccak256(abi.encode(TYPE_HASH, user2, address(market), 50 ether, nonce, deadline));
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 permitHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        
        console.log("Permit hash:");
        console.logBytes32(permitHash);

        // 使用正确的私钥签名 - user2 的地址是 0x3，私钥也是 0x3
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(3, permitHash);
        console.log(" Permit signature created");

        // 准备 multicall 数据
        bytes[] memory calls = new bytes[](2);
        
        calls[0] = abi.encodeWithSignature(
            "permitPrePay(address,address,uint256,uint256,uint8,bytes32,bytes32)",
            user2,
            address(market),
            50 ether,
            deadline,
            v,
            r,
            s
        );
        
        calls[1] = abi.encodeWithSignature(
            "claimNFT(uint256,bytes32[])",
            0,
            user2Proof
        );

        console.log(" Multicall data prepared");

        // 执行 multicall - 一次性调用 permit 和购买
        multicall.multicallSingleTarget(address(market), calls);
        console.log(" Multicall executed successfully");
        
        // 验证购买成功
        assertEq(nft.ownerOf(0), user2, "NFT should be transferred to user2");
        assertTrue(market.hasPurchased(user2, 0), "Purchase should be recorded");
        
        console.log(" Multicall purchase verification passed");
        
        vm.stopPrank();
    }

    function testDiscountCalculation() public {
        vm.prank(user1);
        market.listNFT(0, 100 ether);
        
        (uint256 originalPrice, uint256 discountedPrice) = market.getDiscountedPrice(0);
        assertEq(originalPrice, 100 ether, "Original price should be 100 ether");
        assertEq(discountedPrice, 50 ether, "Discounted price should be 50 ether");
        
        console.log(" Discount calculation correct: 100 -> 50 (50% off)");
    }

    function testNonWhitelistCannotClaim() public {
        vm.startPrank(user1);
        market.listNFT(0, 100 ether);
        nft.approve(address(market), 0);
        vm.stopPrank();
        
        vm.startPrank(user3);
        bytes32[] memory emptyProof;
        
        vm.expectRevert("Not in whitelist");
        market.claimNFT(0, emptyProof);
        
        console.log(" Non-whitelist user correctly blocked");
        
        vm.stopPrank();
    }

    function testDoublePurchaseProtection() public {
        vm.startPrank(user1);
        market.listNFT(0, 100 ether);
        nft.approve(address(market), 0);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(market), 100 ether);
        
        // 第一次购买
        market.claimNFT(0, user2Proof);
        console.log(" First purchase successful");
        
        // 尝试第二次购买
        vm.expectRevert("Already purchased");
        market.claimNFT(0, user2Proof);
        console.log(" Second purchase correctly blocked");
        
        vm.stopPrank();
    }

    function testListNFT() public {
        vm.prank(user1);
        market.listNFT(0, 100 ether);
        
        (uint256 originalPrice, uint256 discountedPrice) = market.getDiscountedPrice(0);
        assertEq(originalPrice, 100 ether, "Original price should be 100 ether");
        assertEq(discountedPrice, 50 ether, "Discounted price should be 50 ether");
        
        console.log(" NFT listing successful");
    }

    function testPermitFunction() public {
        vm.startPrank(user2);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(user2);
        
        console.log("Testing permit for user2:");
        console.log("User2 address:", user2);
        console.log("Nonce:", nonce);
        console.log("Deadline:", deadline);

        // 正确的 permit 哈希构建
        bytes32 TYPE_HASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash = keccak256(abi.encode(TYPE_HASH, user2, address(market), 50 ether, nonce, deadline));
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 permitHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        
        console.log("Domain separator:");
        console.logBytes32(domainSeparator);
        console.log("Permit hash:");
        console.logBytes32(permitHash);

        // 使用正确的私钥签名
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(3, permitHash);
        console.log(" Signature created");

        // 直接测试 token 的 permit 函数
        token.permit(user2, address(market), 50 ether, deadline, v, r, s);

        // 验证授权成功
        uint256 allowance = token.allowance(user2, address(market));
        assertEq(allowance, 50 ether, "Allowance should be set to 50 ether");
        
        console.log(" Permit function working correctly");
        
        vm.stopPrank();
    }

    // 添加一个简单的测试来验证基本功能
    function testBasicMulticall() public {
        vm.startPrank(user1);
        market.listNFT(0, 100 ether);
        nft.approve(address(market), 0);
        vm.stopPrank();

        vm.startPrank(user2);
        
        // 预先授权 token
        token.approve(address(market), 50 ether);
        
        // 只测试 claimNFT 的 multicall
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeWithSignature(
            "claimNFT(uint256,bytes32[])",
            0,
            user2Proof
        );

        multicall.multicallSingleTarget(address(market), calls);
        
        assertEq(nft.ownerOf(0), user2);
        assertTrue(market.hasPurchased(user2, 0));
        
        console.log(" Basic multicall test passed");
        
        vm.stopPrank();
    }
}