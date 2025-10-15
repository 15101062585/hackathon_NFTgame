// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "day06/MyNft.sol";
import "./BaseERC20V2612.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract NFTMarket {
    using ECDSA for bytes32;

    struct Listing {
        address seller;
        uint256 price;
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

    // 事件定义
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    event NFTBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    event NFTCancelled(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 timestamp
    );
    event NFTWhitelistBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );
    event WhitelistSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    // 构造函数 - 立即初始化域分隔符
    constructor(
        MyNft _nftContract,
        MyTokenERC2612 _tokenContract,
        address _whitelistSigner
    ) {
        require(address(_nftContract) != address(0), "Invalid NFT contract");
        require(
            address(_tokenContract) != address(0),
            "Invalid token contract"
        );
        require(_whitelistSigner != address(0), "Invalid whitelist signer");

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
        require(_price > 0, "Price must be greater than 0");
        require(nftContract.ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(!listings[_tokenId].isListed, "NFT already listed");

        // 转移NFT到市场合约
        nftContract.transferFrom(msg.sender, address(this), _tokenId);

        listings[_tokenId] = Listing({
            seller: msg.sender,
            price: _price,
            isListed: true
        });

        emit NFTListed(_tokenId, msg.sender, _price, block.timestamp);
    }

    // 普通购买NFT
    function buyNFT(uint256 _tokenId) external {
        Listing storage listing = listings[_tokenId];
        require(listing.isListed, "NFT not listed");
        require(listing.price > 0, "Invalid price");

        // 检查代币授权
        require(
            tokenContract.allowance(msg.sender, address(this)) >= listing.price,
            "Insufficient allowance"
        );

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
        Listing storage listing = listings[_tokenId];

        // 基础验证
        require(listing.isListed, "NFT not listed");
        require(block.timestamp <= _deadline, "Signature expired");
        require(listing.price <= _maxPrice, "Price exceeds limit");
        require(!usedNonces[_nonce], "Nonce already used");

        // 验证白名单签名
        require(
            _verifyWhitelist(
                msg.sender,
                _tokenId,
                _maxPrice,
                _deadline,
                _nonce,
                _signature
            ),
            "Invalid whitelist signature"
        );

        // 检查代币授权
        require(
            tokenContract.allowance(msg.sender, address(this)) >= listing.price,
            "Insufficient allowance"
        );

        // 标记nonce已使用
        usedNonces[_nonce] = true;

        // 执行购买
        _executePurchase(_tokenId, msg.sender, listing.price);

        emit NFTWhitelistBought(
            _tokenId,
            msg.sender,
            listing.seller,
            listing.price,
            block.timestamp
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

        require(listing.isListed, "NFT not listed");

        // 转移代币从买家到卖家
        require(
            tokenContract.transferFrom(_buyer, listing.seller, _price),
            "Token transfer failed"
        );

        // 转移NFT从市场到买家
        nftContract.transferFrom(address(this), _buyer, _tokenId);

        // 更新状态
        listing.isListed = false;

        emit NFTBought(
            _tokenId,
            _buyer,
            listing.seller,
            _price,
            block.timestamp
        );
    }

    // 支持 transferWithCallback 购买NFT
    function tokensReceived(
        address _from,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external returns (bool) {
        require(
            msg.sender == address(tokenContract),
            "Caller must be token contract"
        );
        require(_to == address(this), "Receiver must be market");
        require(_data.length >= 32, "Data must contain tokenId");

        uint256 tokenId = abi.decode(_data, (uint256));
        Listing storage listing = listings[tokenId];

        require(listing.isListed, "NFT not listed");
        require(_value >= listing.price, "Insufficient payment");

        // 转移代币给卖家
        require(
            tokenContract.transfer(listing.seller, listing.price),
            "Token transfer to seller failed"
        );

        // 如果有超额支付，退回多余金额
        if (_value > listing.price) {
            uint256 refund = _value - listing.price;
            require(tokenContract.transfer(_from, refund), "Refund failed");
        }

        // 转移NFT给买家
        nftContract.transferFrom(address(this), _from, tokenId);

        // 更新状态
        listing.isListed = false;

        emit NFTBought(
            tokenId,
            _from,
            listing.seller,
            listing.price,
            block.timestamp
        );

        return true;
    }

    // 取消上架
    function cancelListing(uint256 _tokenId) external {
        Listing storage listing = listings[_tokenId];
        require(listing.isListed, "NFT not listed");
        require(listing.seller == msg.sender, "Not the seller");

        // 转移NFT回给卖家
        nftContract.transferFrom(address(this), msg.sender, _tokenId);

        // 更新状态
        listing.isListed = false;

        emit NFTCancelled(_tokenId, msg.sender, block.timestamp);
    }

    // 更新白名单签名者
    function setWhitelistSigner(address _newSigner) external {
        require(_newSigner != address(0), "Invalid signer address");
        require(_newSigner != whitelistSigner, "Same as current signer");

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
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.isListed, "NFT not listed");

        // 只有在合约出现问题时使用
        nftContract.transferFrom(address(this), msg.sender, _tokenId);
        listing.isListed = false;

        emit NFTCancelled(_tokenId, msg.sender, block.timestamp);
    }
}
