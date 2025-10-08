// src/components/ListNFT.jsx
import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';

const ListNFT = ({ userAddress }) => {
  const [tokenId, setTokenId] = useState('');
  const [price, setPrice] = useState('');
  const [userNFTs, setUserNFTs] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listing, setListing] = useState(false);
  
  const { getUserNFTs, listNFT, checkApproval, loading: contractLoading } = useContract();

  // 加载用户的NFT
  const loadUserNFTs = async () => {
    if (!userAddress) {
      setUserNFTs([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nfts = await getUserNFTs(userAddress);
      // 过滤出未上架的NFT
      const unlistedNFTs = nfts.filter(nft => !nft.isListed);
      setUserNFTs(unlistedNFTs);
    } catch (err) {
      console.error('加载用户NFT失败:', err);
      setError('加载用户NFT失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 选择NFT
  const handleNFTClick = async (nft) => {
    setSelectedNFT(nft);
    setTokenId(nft.tokenId);
    setPrice('');
    setError(null);

    // 检查NFT是否已批准给市场合约
    try {
      const isApproved = await checkApproval(nft.tokenId, userAddress);
      if (!isApproved) {
        setError('提示：此NFT尚未授权给市场合约，上架时会自动处理授权');
      }
    } catch (err) {
      console.error('检查授权状态失败:', err);
    }
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userAddress) {
      alert('请先连接钱包');
      return;
    }

    if (!tokenId || !price) {
      alert('请输入Token ID和价格');
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      alert('请输入有效的价格');
      return;
    }

    try {
      setListing(true);
      setError(null);
      await listNFT(tokenId, price);
      alert('NFT上架成功！');
      // 重置表单并重新加载NFT列表
      setTokenId('');
      setPrice('');
      setSelectedNFT(null);
      await loadUserNFTs();
    } catch (err) {
      console.error('NFT上架失败:', err);
      setError('NFT上架失败: ' + (err.message || '未知错误'));
    } finally {
      setListing(false);
    }
  };

  // 当用户地址变化时重新加载NFT
  useEffect(() => {
    loadUserNFTs();
  }, [userAddress, getUserNFTs]);

  return (
    <div className="list-nft">
      <div className="list-header">
        <h2>上架NFT</h2>
        <button 
          className="refresh-button"
          onClick={loadUserNFTs}
          disabled={loading}
        >
          {loading ? '加载中...' : '刷新列表'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {!userAddress && (
        <div className="no-wallet">请先连接钱包</div>
      )}
      
      {userAddress && (
        <div className="list-container">
          {/* 上架表单 */}
          <div className="listing-form">
            <h3>上架新NFT</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="tokenId">Token ID</label>
                <input
                  type="number"
                  id="tokenId"
                  value={tokenId}
                  onChange={(e) => {
                    setTokenId(e.target.value);
                    setSelectedNFT(null);
                  }}
                  placeholder="输入NFT的Token ID"
                  min="1"
                  disabled={listing}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="price">价格 (ETH)</label>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="输入NFT的价格"
                  min="0.01"
                  step="0.01"
                  disabled={listing}
                />
              </div>
              
              <button 
                type="submit" 
                className="list-button"
                disabled={listing || !userAddress || !tokenId || !price}
              >
                {listing ? '处理中...' : '上架NFT'}
              </button>
            </form>
          </div>
          
          {/* 用户未上架的NFT列表 */}
          <div className="user-nfts">
            <h3>可上架的NFT</h3>
            
            {loading && !error ? (
              <div className="loading">加载NFT中...</div>
            ) : userNFTs.length === 0 ? (
              <div className="empty-nfts">
                您目前没有可上架的NFT
                {error && <p>{error}</p>}
              </div>
            ) : (
              <div className="nft-list">
                {userNFTs.map((nft) => (
                  <div 
                    key={nft.tokenId}
                    className={`nft-item ${selectedNFT?.tokenId === nft.tokenId ? 'selected' : ''}`}
                    onClick={() => handleNFTClick(nft)}
                  >
                    <img 
                      src={nft.image || `https://picsum.photos/200/200?random=${nft.tokenId}`} 
                      alt={nft.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://picsum.photos/200/200?random=${nft.tokenId}`;
                      }}
                      className="nft-preview"
                    />
                    <div className="nft-details">
                      <h4>{nft.name}</h4>
                      <p>Token ID: {nft.tokenId}</p>
                      <p className="nft-status">
                        {nft.isListed ? '🟢 已上架' : '⚪ 未上架'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListNFT;