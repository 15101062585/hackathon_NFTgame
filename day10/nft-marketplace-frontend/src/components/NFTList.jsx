// src/components/NFTList.jsx
import React from 'react';
import { useNFTData, useContract } from '../hooks/useContract';
import NFTItem from './NFTItem';

const NFTList = ({ userAddress }) => {
  const { nfts, loading, refetch } = useNFTData();
  const { getNFTContract, listNFT, buyNFT } = useContract();

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="nft-list">
      <div className="list-header">
        <h2>NFT 市场</h2>
        <button onClick={refetch} className="refresh-btn">
          刷新
        </button>
      </div>
      
      {nfts.length === 0 ? (
        <div className="empty-state">
          <p>暂无上架的 NFT</p>
        </div>
      ) : (
        <div className="nft-grid">
          {nfts.map(nft => (
            <NFTItem 
              key={nft.id} 
              nft={nft} 
              userAddress={userAddress}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTList;