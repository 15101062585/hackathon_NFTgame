// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MyNft.sol";
import "./BaseERC20V2612.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract NFTMarketV2621 {
    using ECDSA for bytes32;

    struct Listing {
        address seller;
        uint96 price; // 使用 uint96 节省存储空间，足够表示大多数价格
        bool isListed;
    }

    // 合约地址
    MyNft public immutable nftContract;
    MyTokenERC2612 public immutable tokenContract;

    // NFT上架信息映射
    mapping(uint256 => Listing) public listings;

    // 白名单签名者地址
    address public whitelistSigner;

    // 防止重放攻击的nonce映射
    mapping(uint256 => bool) public usedNonces;

    // EIP-712 常量
    bytes32 public constant WHITELIST_TYPEHASH =
        keccak256(
            "Whitelist(address user,uint256 nftId,uint256 maxPrice,uint256 deadline,uint256 nonce)"
        );

    bytes32 public DOMAIN_SEPARATOR;

    // 事件定义 - 移除不必要的 indexed 和 timestamp 减少 gas
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event NFTBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event NFTCancelled(
        uint256 indexed tokenId,
        address indexed seller
    );
    event NFTWhitelistBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event WhitelistSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    // 自定义错误 - 比 require 字符串更省 gas
    error InvalidAddress();
    error InvalidPrice();
    error NotOwner();
    error AlreadyListed();
    error NotListed();
    error InsufficientAllowance();
    error SignatureExpired();
    error PriceExceedsLimit();
    error NonceAlreadyUsed();
    error InvalidWhitelistSignature();
    error TransferFailed();

    // 构造函数 - 立即初始化域分隔符
    constructor(
        MyNft _nftContract,
        MyTokenERC2612 _tokenContract,
        address _whitelistSigner
    ) {
        if (address(_nftContract) == address(0) || 
            address(_tokenContract) == address(0) || 
            _whitelistSigner == address(0)) {
            revert InvalidAddress();
        }

        nftContract = _nftContract;
        tokenContract = _tokenContract;
        whitelistSigner = _whitelistSigner;

        // 立即初始化域分隔符
        _initializeDomainSeparator();

        emit WhitelistSignerUpdated(address(0), _whitelistSigner);
    }

    // 初始化域分隔符（内部函数）
    function _initializeDomainSeparator() internal {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("NFTMarket"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // 上架NFT
    function list(uint256 _tokenId, uint256 _price) external {
        if (_price == 0) revert InvalidPrice();
        if (nftContract.ownerOf(_tokenId) != msg.sender) revert NotOwner();
        
        Listing storage listing = listings[_tokenId];
        if (listing.isListed) revert AlreadyListed();

        // 转移NFT到市场合约
        nftContract.transferFrom(msg.sender, address(this), _tokenId);

        // 直接设置存储变量，避免结构体复制
        listing.seller = msg.sender;
        listing.price = uint96(_price); // 安全转换，价格通常不会超过 uint96
        listing.isListed = true;

        emit NFTListed(_tokenId, msg.sender, _price);
    }

    // 普通购买NFT
    function buyNFT(uint256 _tokenId) external {
        Listing memory listing = listings[_tokenId]; // 使用 memory 避免多次存储读取
        if (!listing.isListed) revert NotListed();
        if (listing.price == 0) revert InvalidPrice();

        // 检查代币授权
        if (tokenContract.allowance(msg.sender, address(this)) < listing.price) {
            revert InsufficientAllowance();
        }

        // 执行交易
        _executePurchase(_tokenId, msg.sender, listing.price);
    }

    // 白名单购买NFT
    function permitBuy(
        uint256 _tokenId,
        uint256 _maxPrice,
        uint256 _deadline,
        bytes memory _signature,
        uint256 _nonce
    ) external {
        Listing memory listing = listings[_tokenId]; // 使用 memory 缓存

        // 基础验证
        if (!listing.isListed) revert NotListed();
        if (block.timestamp > _deadline) revert SignatureExpired();
        if (listing.price > _maxPrice) revert PriceExceedsLimit();
        if (usedNonces[_nonce]) revert NonceAlreadyUsed();

        // 验证白名单签名
        if (!_verifyWhitelist(
            msg.sender,
            _tokenId,
            _maxPrice,
            _deadline,
            _nonce,
            _signature
        )) {
            revert InvalidWhitelistSignature();
        }

        // 检查代币授权
        if (tokenContract.allowance(msg.sender, address(this)) < listing.price) {
            revert InsufficientAllowance();
        }

        // 标记nonce已使用
        usedNonces[_nonce] = true;

        // 执行购买
        _executePurchase(_tokenId, msg.sender, listing.price);

        emit NFTWhitelistBought(
            _tokenId,
            msg.sender,
            listing.seller,
            listing.price
        );
    }

    // 验证白名单签名
    function _verifyWhitelist(
        address _user,
        uint256 _nftId,
        uint256 _maxPrice,
        uint256 _deadline,
        uint256 _nonce,
        bytes memory _signature
    ) internal view returns (bool) {
        // 构建EIP-712哈希
        bytes32 structHash = keccak256(
            abi.encode(
                WHITELIST_TYPEHASH,
                _user,
                _nftId,
                _maxPrice,
                _deadline,
                _nonce
            )
        );

        // 构建完整哈希
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        // 恢复签名者地址
        address recoveredSigner = digest.recover(_signature);

        // 验证签名者
        return recoveredSigner == whitelistSigner;
    }

    // 在您的 NFTMarket 合约中添加此函数
    function debugWhitelistHash(
        address _user,
        uint256 _nftId,
        uint256 _maxPrice,
        uint256 _deadline,
        uint256 _nonce
    )
        public
        view
        returns (
            bytes32 domainSeparator,
            bytes32 typeHash,
            bytes32 structHash,
            bytes32 digest,
            bytes32 recoveredSigner
        )
    {
        // 返回域分隔符和类型哈希
        domainSeparator = DOMAIN_SEPARATOR;
        typeHash = WHITELIST_TYPEHASH;

        // 计算结构体哈希
        structHash = keccak256(
            abi.encode(
                WHITELIST_TYPEHASH,
                _user,
                _nftId,
                _maxPrice,
                _deadline,
                _nonce
            )
        );

        // 计算完整摘要
        digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
    }

    // 执行购买逻辑（内部函数）
    function _executePurchase(
        uint256 _tokenId,
        address _buyer,
        uint256 _price
    ) internal {
        Listing storage listing = listings[_tokenId];

        if (!listing.isListed) revert NotListed();

        // 转移代币从买家到卖家
        if (!tokenContract.transferFrom(_buyer, listing.seller, _price)) {
            revert TransferFailed();
        }

        // 转移NFT从市场到买家
        nftContract.transferFrom(address(this), _buyer, _tokenId);

        // 更新状态 - 只修改必要的字段
        listing.isListed = false;

        emit NFTBought(
            _tokenId,
            _buyer,
            listing.seller,
            _price
        );
    }

    // 支持 transferWithCallback 购买NFT
    function tokensReceived(
        address _from,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external returns (bool) {
        if (msg.sender != address(tokenContract)) revert InvalidAddress();
        if (_to != address(this)) revert InvalidAddress();
        if (_data.length < 32) revert InvalidAddress();

        uint256 tokenId = abi.decode(_data, (uint256));
        Listing memory listing = listings[tokenId]; // 使用 memory 缓存

        if (!listing.isListed) revert NotListed();
        if (_value < listing.price) revert InsufficientAllowance();

        // 转移代币给卖家
        if (!tokenContract.transfer(listing.seller, listing.price)) {
            revert TransferFailed();
        }

        // 如果有超额支付，退回多余金额
        if (_value > listing.price) {
            uint256 refund = _value - listing.price;
            if (!tokenContract.transfer(_from, refund)) revert TransferFailed();
        }

        // 转移NFT给买家
        nftContract.transferFrom(address(this), _from, tokenId);

        // 更新状态
        listings[tokenId].isListed = false;

        emit NFTBought(
            tokenId,
            _from,
            listing.seller,
            listing.price
        );

        return true;
    }

    // 取消上架
    function cancelListing(uint256 _tokenId) external {
        Listing storage listing = listings[_tokenId];
        if (!listing.isListed) revert NotListed();
        if (listing.seller != msg.sender) revert NotOwner();

        // 转移NFT回给卖家
        nftContract.transferFrom(address(this), msg.sender, _tokenId);

        // 更新状态 - 只修改必要的字段
        listing.isListed = false;

        emit NFTCancelled(_tokenId, msg.sender);
    }

    // 更新白名单签名者
    function setWhitelistSigner(address _newSigner) external {
        if (_newSigner == address(0)) revert InvalidAddress();
        if (_newSigner == whitelistSigner) revert InvalidAddress();

        address oldSigner = whitelistSigner;
        whitelistSigner = _newSigner;

        emit WhitelistSignerUpdated(oldSigner, _newSigner);
    }

    // 检查nonce是否已使用
    function isNonceUsed(uint256 _nonce) external view returns (bool) {
        return usedNonces[_nonce];
    }

    // 获取域分隔符
    function getDomainSeparator() external view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    // 获取合约信息
    function getContractInfo()
        external
        view
        returns (
            address nftAddr,
            address tokenAddr,
            address signerAddr,
            bytes32 domainSeparator
        )
    {
        return (
            address(nftContract),
            address(tokenContract),
            whitelistSigner,
            DOMAIN_SEPARATOR
        );
    }

    // 紧急停止函数（可选）
    function emergencyWithdrawNFT(uint256 _tokenId) external {
        Listing storage listing = listings[_tokenId];
        if (listing.seller != msg.sender) revert NotOwner();
        if (!listing.isListed) revert NotListed();

        nftContract.transferFrom(address(this), msg.sender, _tokenId);
        listing.isListed = false;

        emit NFTCancelled(_tokenId, msg.sender);
    }
}