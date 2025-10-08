// src/components/NFTItem.jsx
import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { CONTRACT_ADDRESSES } from '../contracts/addresses'; // 添加这行导入

const NFTItem = ({ nft, userAddress, onUpdate }) => {
  const [buying, setBuying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { buyNFT, getTokenBalance, getTokenAllowance } = useContract();
  const [tokenBalance, setTokenBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');

  // 检查代币余额和授权
  React.useEffect(() => {
    const checkBalanceAndAllowance = async () => {
      if (userAddress) {
        const balance = await getTokenBalance(userAddress);
        const marketAddress = CONTRACT_ADDRESSES.NFTMarket; // 现在这个变量已定义
        const allowanceAmount = await getTokenAllowance(userAddress, marketAddress);
        setTokenBalance(balance);
        setAllowance(allowanceAmount);
      }
    };
    
    checkBalanceAndAllowance();
  }, [userAddress, getTokenBalance, getTokenAllowance]);

  const handleBuy = async () => {
    if (!userAddress) {
      alert('请先连接钱包');
      return;
    }

    if (nft.seller.toLowerCase() === userAddress.toLowerCase()) {
      alert('不能购买自己上架的 NFT');
      return;
    }

    // 检查余额是否足够
    if (parseFloat(tokenBalance) < parseFloat(nft.price)) {
      alert(`代币余额不足！需要 ${nft.price}，当前余额 ${tokenBalance}`);
      return;
    }

    setBuying(true);
    try {
      await buyNFT(nft.tokenId, nft.price);
      alert('购买成功!');
      if (onUpdate) onUpdate(); // 刷新列表
    } catch (error) {
      console.error('购买失败:', error);
      alert('购买失败: ' + error.message);
    } finally {
      setBuying(false);
    }
  };

  const handleImageError = () => {
    console.log('图片加载失败，使用备用图片');
    setImageError(true);
  };

  const isOwnNFT = nft.seller.toLowerCase() === userAddress?.toLowerCase();
  const hasEnoughBalance = parseFloat(tokenBalance) >= parseFloat(nft.price);
  const hasEnoughAllowance = parseFloat(allowance) >= parseFloat(nft.price);

  // 最终图片 URL
  const finalImageUrl = imageError 
    ? `https://picsum.photos/300/300?random=${nft.tokenId}`
    : nft.image;

  return (
    <div className="nft-item">
      <div className="nft-image">
        <img 
          src={finalImageUrl} 
          alt={nft.name}
          onError={handleImageError}
          loading="lazy"
        />
        {nft.metadata && nft.metadata.attributes && (
          <div className="nft-badge">稀有</div>
        )}
      </div>
      <div className="nft-info">
        <h3>{nft.name}</h3>
        <p className="description">{nft.description}</p>
        
        {nft.metadata && nft.metadata.attributes && (
          <div className="attributes">
            {nft.metadata.attributes.slice(0, 2).map((attr, index) => (
              <span key={index} className="attribute-tag">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}
        
        <p className="price">{nft.price} 代币</p>
        <p className="seller">卖家: {nft.seller.slice(0, 8)}...</p>
        
        {userAddress && (
          <div className="balance-info">
            <small>你的余额: {tokenBalance} 代币</small>
            <small>授权额度: {allowance} 代币</small>
          </div>
        )}
        
        {userAddress && !isOwnNFT && (
          <button 
            className={`buy-btn ${!hasEnoughBalance || !hasEnoughAllowance ? 'disabled' : ''}`}
            onClick={handleBuy}
            disabled={buying || !hasEnoughBalance || !hasEnoughAllowance}
          >
            {buying ? '购买中...' : 
             !hasEnoughBalance ? '余额不足' :
             !hasEnoughAllowance ? '需要授权' : '购买'}
          </button>
        )}
        {isOwnNFT && (
          <button className="own-nft-btn" disabled>
            我的 NFT
          </button>
        )}
        {!userAddress && (
          <button className="buy-btn" disabled>
            请先连接钱包
          </button>
        )}
      </div>
    </div>
  );
};

export default NFTItem;