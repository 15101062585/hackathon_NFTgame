// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MyNft.sol";
import "./BaseERC20v2.sol";

contract NFTMarket{

    struct ListString{
        address seller;
        uint256 price;
        bool isListed;

    }

    // NFT合约地址
    MyNft public immutable nftContract;
    // 扩展ERC20代币合约地址
    BaseERC20v2 public immutable tokenContract;
    // NFT上架信息映射
    mapping(uint256 => ListString) public listings;

    // 事件定义
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTBought(uint256 indexed tokenId, address indexed buyer, uint256 price);

    // 构造函数
    constructor(MyNft _nftContract, BaseERC20v2 _tokenContract) {
        nftContract = _nftContract;
        tokenContract = _tokenContract;
    }


    // 上架NFT
    function list(uint256 _tokenId, uint256 _price) external {
        // 检查价格是否大于0
        require(_price > 0, "Price must be greater than 0");
        // 检查调用者是否是NFT的所有者
        require(nftContract.ownerOf(_tokenId) == msg.sender, "You are not the owner of this NFT");
        // 检查NFT是否已经上架
        require(!listings[_tokenId].isListed, "NFT is already listed");

        // 将NFT转移给市场合约（或检查用户是否已经授权）
        // 这里使用transferFrom确保用户已经授权市场合约转移NFT
        nftContract.transferFrom(msg.sender, address(this), _tokenId);

        // 创建上架信息
        listings[_tokenId] = ListString({
            seller: msg.sender,
            price: _price,
            isListed: true
        });

        // 触发上架事件
        emit NFTListed(_tokenId, msg.sender, _price);
    }

    // 购买NFT
    function buyNFT(uint256 _tokenId) external {
        ListString storage listing = listings[_tokenId];
        // 检查NFT是否上架
        require(listing.isListed, "NFT is not listed for sale");
        // 检查价格是否大于0
        require(listing.price > 0, "Price must be greater than 0");

        // 检查调用者是否已经授权市场合约转移代币
        require(tokenContract.allowance(msg.sender, address(this)) >= listing.price, "Insufficient allowance");

        // 从买家账户扣除代币并转给卖家
        tokenContract.transferFrom(msg.sender, listing.seller, listing.price);

        // 将NFT从市场合约转给买家
        nftContract.transferFrom(address(this), msg.sender, _tokenId);

        // 标记NFT为已下架
        listing.isListed = false;

        // 触发购买事件
        emit NFTBought(_tokenId, msg.sender, listing.price);
    }

    // 实现tokensReceived方法，支持通过transferWithCallback购买NFT
    function tokensReceived(address _from, address _to, uint256 _value, bytes calldata _data) external returns (bool) {
        // 确保调用者是代币合约
        require(msg.sender == address(tokenContract), "Caller must be the token contract");
        // 确保接收地址是市场合约
        require(_to == address(this), "Receiver must be the market contract");
        // 确保数据不为空
        require(_data.length >= 32, "Data must contain tokenId");

        // 从data参数中解析出NFT的tokenId
        uint256 tokenId = abi.decode(_data, (uint256));
        ListString storage listing = listings[tokenId];

        // 检查NFT是否上架
        require(listing.isListed, "NFT is not listed for sale");
        // 检查价格是否大于0
        require(listing.price > 0, "Price must be greater than 0");

        // 这里假设在transferWithCallback时，已经转移了足够的代币到市场合约
        // 所以我们需要从市场合约余额中转给卖家
        tokenContract.transfer(listing.seller, listing.price);

        // 将NFT从市场合约转给买家
        nftContract.transferFrom(address(this), _from, tokenId);

        // 标记NFT为已下架
        listing.isListed = false;

        // 触发购买事件
        emit NFTBought(tokenId, _from, listing.price);

        return true;
    }

    // 卖家取消上架
    function cancelListing(uint256 _tokenId) external {
        ListString storage listing = listings[_tokenId];
        // 检查NFT是否上架
        require(listing.isListed, "NFT is not listed");
        // 检查调用者是否是卖家
        require(listing.seller == msg.sender, "You are not the seller");

        // 将NFT从市场合约转回给卖家
        nftContract.transferFrom(address(this), msg.sender, _tokenId);

        // 标记NFT为已下架
        listing.isListed = false;
    }

    
}