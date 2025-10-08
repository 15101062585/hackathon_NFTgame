import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';

const MyNFTs = ({ userAddress }) => {
  const { getUserNFTs, listNFT, cancelListing, isInitialized, loading } = useContract();
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userAddress) {
      loadUserNFTs();
    }
  }, [userAddress, isInitialized]);

  const loadUserNFTs = async () => {
    try {
      const userNFTs = await getUserNFTs(userAddress);
      setNfts(userNFTs);
    } catch (err) {
      setError('加载用户NFT失败: ' + err.message);
    }
  };

  const handleListNFT = async (tokenId, price) => {
    try {
      await listNFT(tokenId, price);
      await loadUserNFTs(); // 刷新列表
    } catch (err) {
      setError('上架失败: ' + err.message);
    }
  };

  const handleCancelListing = async (tokenId) => {
    try {
      await cancelListing(tokenId);
      await loadUserNFTs(); // 刷新列表
    } catch (err) {
      setError('取消上架失败: ' + err.message);
    }
  };

  if (!userAddress) return <div>请先连接钱包</div>;
  if (!isInitialized) return <div>初始化中...</div>;

  return (
    <div className="my-nfts">
      <h2>我的 NFT</h2>
      {error && <div className="error">{error}</div>}
      <div className="nft-grid">
        {nfts.map(nft => (
          <div key={nft.tokenId} className="nft-card">
            <img src={nft.image} alt={nft.name} />
            <h3>{nft.name}</h3>
            <p>{nft.description}</p>
            {nft.isListed ? (
              <div>
                <div className="price">价格: {nft.price} ETH</div>
                <button 
                  onClick={() => handleCancelListing(nft.tokenId)}
                  disabled={loading}
                >
                  {loading ? '取消中...' : '取消上架'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleListNFT(nft.tokenId, '0.1')} // 默认价格
                disabled={loading}
              >
                {loading ? '上架中...' : '上架出售'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyNFTs;