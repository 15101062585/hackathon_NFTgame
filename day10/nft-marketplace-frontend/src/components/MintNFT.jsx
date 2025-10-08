// src/components/MintNFT.jsx
import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';

const MintNFT = ({ userAddress, onMintSuccess }) => {
  const [minting, setMinting] = useState(false);
  const [tokenURI, setTokenURI] = useState('');
  const { mintNFT } = useContract();

  const handleMint = async (e) => {
    e.preventDefault();
    
    if (!userAddress) {
      alert('请先连接钱包');
      return;
    }

    if (!tokenURI) {
      alert('请输入 Token URI');
      return;
    }

    setMinting(true);
    try {
      await mintNFT(tokenURI);
      alert('NFT 铸造成功!');
      setTokenURI('');
      if (onMintSuccess) onMintSuccess();
    } catch (error) {
      console.error('铸造失败:', error);
      alert('铸造失败: ' + error.message);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="mint-nft">
      <h2>铸造 NFT</h2>
      <form onSubmit={handleMint} className="mint-form">
        <div className="form-group">
          <label>Token URI:</label>
          <input
            type="text"
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            placeholder="输入 NFT 的元数据 URI"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="mint-btn"
          disabled={minting || !userAddress}
        >
          {minting ? '铸造中...' : '铸造 NFT'}
        </button>
      </form>
    </div>
  );
};

export default MintNFT;