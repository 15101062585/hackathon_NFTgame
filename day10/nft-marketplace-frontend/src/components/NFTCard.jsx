// src/components/NFTCard.jsx
import React, { useState } from 'react';

const NFTCard = ({ 
  nft, 
  onBuy, 
  canBuy = false,
  isLoading = false,
  userAddress,
  onAction,
  actionText,
  showOwnerTag = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const getImageSourceType = (uri) => {
    if (!uri) return '未知';
    if (uri.startsWith('ipfs://')) return 'IPFS';
    if (uri.startsWith('https://')) return 'HTTPS';
    if (uri.startsWith('http://')) return 'HTTP';
    if (uri.startsWith('ar://')) return 'Arweave';
    return '其他';
  };

  // 最终显示的图片URL
  const displayImage = imageError 
    ? `https://picsum.photos/300/300?random=${nft.tokenId}`
    : nft.image;

  return (
    <div className="nft-card">
      {/* 所有者标签 - 放在最上层 */}
      {showOwnerTag && userAddress && nft.owner && userAddress.toLowerCase() === nft.owner.toLowerCase() && (
        <div className="owner-tag">
          我的NFT
        </div>
      )}

      <div className="nft-image-container">
        {/* 图片加载状态 */}
        {imageLoading && (
          <div className="image-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        {/* 图片 */}
        <img 
          src={displayImage}
          alt={nft.name || `NFT #${nft.tokenId}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            display: imageLoading ? 'none' : 'block',
            opacity: imageLoading ? 0 : 1 
          }}
          className="nft-image"
        />
        
        {/* 图片源类型标签 */}
        {!imageLoading && nft.tokenURI && (
          <div className="image-source">
            {getImageSourceType(nft.tokenURI)}
          </div>
        )}
        
        {/* 加载失败备用显示 */}
        {imageError && !imageLoading && (
          <div className="fallback-image">
            <span>📷</span>
          </div>
        )}
      </div>
      
      <div className="nft-info">
        <h3 className="nft-name">{nft.name}</h3>
        <p className="nft-id">Token ID: #{nft.tokenId}</p>
        <p className="nft-description">{nft.description}</p>
        
        {/* 价格信息 */}
        {nft.price && (
          <p className="nft-price">
            <span className="nft-price-label">价格:</span> {nft.price} TOKEN
          </p>
        )}
        
        {/* 卖家信息 */}
        {nft.seller && (
          <p className="nft-seller">
            <span className="nft-seller-label">卖家:</span> {nft.seller.slice(0, 8)}...
          </p>
        )}
        
        {/* 上架状态 */}
        {nft.isListed !== undefined && (
          <p className="nft-status">
            {nft.isListed ? '🟢 已上架' : '⚪ 未上架'}
          </p>
        )}
        
        {/* 操作按钮区域 */}
        <div className="nft-actions">
          {/* 购买按钮 */}
          {canBuy && onBuy && (
            <button 
              onClick={() => onBuy()}
              disabled={isLoading}
              className={`buy-btn ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? '处理中...' : '购买'}
            </button>
          )}
          
          {/* 通用操作按钮 (用于上架/取消上架) */}
          {onAction && actionText && !canBuy && (
            <button 
              onClick={() => onAction(nft)}
              disabled={isLoading}
              className={`action-btn ${actionText.includes('取消') ? 'cancel-btn' : ''} ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? '处理中...' : actionText}
            </button>
          )}
          
          {/* 如果是自己的NFT且已上架但没有操作按钮 */}
          {userAddress && nft.seller && userAddress.toLowerCase() === nft.seller.toLowerCase() && !onAction && (
            <div className="own-nft">我的 NFT</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFTCard;