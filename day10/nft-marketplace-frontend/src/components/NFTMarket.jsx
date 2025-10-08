// src/components/NFTMarket.jsx
import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';

const NFTMarket = ({ userAddress }) => {
  const { getListedNFTs, buyNFT, isInitialized, loading } = useContract();
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState('');
  const [purchasingTokenId, setPurchasingTokenId] = useState(null);

  useEffect(() => {
    if (isInitialized) {
      loadMarketNFTs();
    }
  }, [isInitialized]);

  const loadMarketNFTs = async () => {
    try {
      setError('');
      const listedNFTs = await getListedNFTs();
      setNfts(listedNFTs);
    } catch (err) {
      console.error('加载市场NFT失败:', err);
      setError('加载市场NFT失败: ' + err.message);
    }
  };

  const handleBuyNFT = async (tokenId) => {
    if (!userAddress) {
      setError('请先连接钱包');
      return;
    }

    try {
      setError('');
      setPurchasingTokenId(tokenId);
      
      console.log(`开始购买NFT #${tokenId}`);
      
      // 确认购买
      const confirmed = window.confirm(`确定要购买 NFT #${tokenId} 吗？`);
      if (!confirmed) {
        return;
      }

      // 执行购买
      const result = await buyNFT(tokenId);
      
      if (result) {
        alert('购买成功！');
        // 刷新列表
        await loadMarketNFTs();
      }
      
    } catch (err) {
      console.error('购买失败:', err);
      setError('购买失败: ' + err.message);
    } finally {
      setPurchasingTokenId(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>初始化中...</p>
      </div>
    );
  }

  return (
    <div className="nft-market">
      <div className="page-header">
        <h2>🎨 NFT 市场</h2>
        <p>探索和购买独特的数字艺术品</p>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      <div className="nft-grid">
        {nfts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <h3>暂无上架的NFT</h3>
            <p>市场上还没有NFT上架，成为第一个上架NFT的人吧！</p>
          </div>
        ) : (
          nfts.map(nft => (
            <div key={nft.tokenId} className="nft-card">
              <div className="nft-image-container">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="nft-image"
                  onError={(e) => {
                    e.target.src = `https://picsum.photos/400/400?random=${nft.tokenId}`;
                  }}
                />
                <div className="nft-overlay">
                  <span className="token-id">#{nft.tokenId}</span>
                </div>
              </div>
              
              <div className="nft-info">
                <h3 className="nft-name">{nft.name}</h3>
                <p className="nft-description">{nft.description}</p>
                
                <div className="nft-details">
                  <div className="seller-info">
                    <span className="label">卖家:</span>
                    <span className="address">
                      {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}
                    </span>
                  </div>
                  
                  <div className="price-info">
                    <span className="label">价格:</span>
                    <span className="price">{nft.price} ETH</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleBuyNFT(nft.tokenId)}
                  disabled={loading && purchasingTokenId === nft.tokenId}
                  className={`buy-button ${loading && purchasingTokenId === nft.tokenId ? 'loading' : ''}`}
                >
                  {loading && purchasingTokenId === nft.tokenId ? (
                    <>
                      <div className="button-spinner"></div>
                      购买中...
                    </>
                  ) : (
                    '立即购买'
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      
    </div>
  );
};

export default NFTMarket;