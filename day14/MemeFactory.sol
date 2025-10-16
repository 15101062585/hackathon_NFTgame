// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MemeToken.sol";

contract MemeFactory {
    address public immutable memeTokenImplementation;
    address public projectTreasury;
    
    mapping(address => bool) public isMemeToken;
    mapping(address => address) public tokenCreators;
    
    event MemeDeployed(
        address indexed creator,
        address indexed tokenAddress,
        string symbol,
        uint256 totalSupply,
        uint256 perMint,
        uint256 price
    );
    
    event MemeMinted(
        address indexed minter,
        address indexed tokenAddress,
        uint256 amount,
        uint256 payment
    );

    constructor(address _projectTreasury) {
        // 部署实现合约
        memeTokenImplementation = address(new MemeToken());
        projectTreasury = _projectTreasury;
    }

    function deployMeme(
        string memory symbol,
        uint256 totalSupply,
        uint256 perMint,
        uint256 price
    ) external returns (address memeToken) {
        require(totalSupply > 0, "Total supply must be positive");
        require(perMint > 0 && perMint <= totalSupply, "Invalid mint amount");
        require(price > 0, "Price must be positive");

        // 使用最小代理模式创建合约
        bytes20 targetBytes = bytes20(memeTokenImplementation);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            memeToken := create(0, clone, 0x37)
        }
        require(memeToken != address(0), "Failed to deploy clone");
        
        // 初始化代理合约
        MemeToken(memeToken).initialize(symbol, totalSupply, perMint, price);
        
        // 转移所有权给创建者
        MemeToken(memeToken).transferOwnership(msg.sender);
        
        isMemeToken[memeToken] = true;
        tokenCreators[memeToken] = msg.sender;
        
        emit MemeDeployed(msg.sender, memeToken, symbol, totalSupply, perMint, price);
    }

    function mintMeme(address tokenAddr) external payable {
        require(isMemeToken[tokenAddr], "Invalid token address");
        
        MemeToken token = MemeToken(tokenAddr);
        address creator = tokenCreators[tokenAddr];
        
        uint256 perMint = token.MINT_AMOUNT();
        uint256 price = token.MINT_PRICE();
        uint256 totalPayment = price * perMint;
        
        require(msg.value >= totalPayment, "Insufficient payment");
        require(token.totalSupply() + perMint <= token.MAX_SUPPLY(), "Exceeds total supply");
        require(token.mintingEnabled(), "Minting disabled");

        // 分配费用：1%给项目方，99%给创建者
        uint256 projectShare = totalPayment / 100;
        uint256 creatorShare = totalPayment - projectShare;

        // 转账给项目方
        (bool success1, ) = projectTreasury.call{value: projectShare}("");
        require(success1, "Project transfer failed");

        // 转账给创建者
        (bool success2, ) = creator.call{value: creatorShare}("");
        require(success2, "Creator transfer failed");

        // 铸造代币
        token.mint(msg.sender, perMint);

        // 退款多余的费用
        uint256 refundAmount = msg.value - totalPayment;
        if (refundAmount > 0) {
            (bool success3, ) = msg.sender.call{value: refundAmount}("");
            require(success3, "Refund failed");
        }

        emit MemeMinted(msg.sender, tokenAddr, perMint, totalPayment);
    }

    // 简化 getTokenInfo 函数，拆分成多个函数
    function getTokenBasicInfo(address tokenAddr) external view returns (
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 maxSupply
    ) {
        require(isMemeToken[tokenAddr], "Invalid token address");
        MemeToken token = MemeToken(tokenAddr);
        
        return (
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.MAX_SUPPLY()
        );
    }

    function getTokenMintInfo(address tokenAddr) external view returns (
        uint256 perMint,
        uint256 price,
        bool mintingEnabled
    ) {
        require(isMemeToken[tokenAddr], "Invalid token address");
        MemeToken token = MemeToken(tokenAddr);
        
        return (
            token.MINT_AMOUNT(),
            token.MINT_PRICE(),
            token.mintingEnabled()
        );
    }

    function getTokenCreator(address tokenAddr) external view returns (address) {
        require(isMemeToken[tokenAddr], "Invalid token address");
        return tokenCreators[tokenAddr];
    }

    // 辅助函数：计算部署Gas成本
    function estimateDeployGas() external view returns (uint256) {
        return 150000;
    }
}