// src/components/NFTMarket.jsx
import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';

const NFTMarket = () => {
  const {
    getListedNFTs,
    buyNFT,
    permitBuy,
    isInitialized,
    loading,
    signer,
    initializeContracts
  } = useContract();

  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState('');
  const [purchasingTokenId, setPurchasingTokenId] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [signature, setSignature] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      loadMarketNFTs();
      getWalletAddress();

      // 新增：验证新合约
      verifyNewContract();
    }
  }, [isInitialized]);
  // 添加验证函数
  const verifyNewContract = async () => {
    if (verifyContract) {
      const contractInfo = await verifyContract();
      if (contractInfo && contractInfo.isDomainInitialized) {
        console.log('🎉 新合约验证成功！');
      }
    }
  };
  // 获取钱包地址
  const getWalletAddress = async () => {
    try {
      console.log('🔍 获取钱包地址...');

      // 方式1: 通过 signer 获取
      if (signer) {
        const address = await signer.getAddress();
        console.log('✅ 通过signer获取地址:', address);
        setCurrentAddress(address);
        return address;
      }

      // 方式2: 通过 MetaMask 获取
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });

        if (accounts && accounts.length > 0) {
          console.log('✅ 通过MetaMask获取地址:', accounts[0]);
          setCurrentAddress(accounts[0]);
          return accounts[0];
        }
      }

      console.log('⚠️ 未检测到已连接的钱包');
      return null;

    } catch (error) {
      console.error('❌ 获取钱包地址失败:', error);
      return null;
    }
  };

  // 连接钱包
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError('');

      if (typeof window.ethereum === 'undefined') {
        throw new Error('请安装 MetaMask 钱包');
      }

      console.log('🔄 请求连接钱包...');

      // 请求账户访问权限
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        console.log('✅ 钱包连接成功:', address);
        setCurrentAddress(address);

        // 重新初始化合约（使用新的signer）
        await initializeContracts();

        return address;
      } else {
        throw new Error('用户拒绝了连接请求');
      }

    } catch (error) {
      console.error('❌ 连接钱包失败:', error);

      let errorMessage = '连接钱包失败';
      if (error.code === 4001) {
        errorMessage = '用户拒绝了连接请求';
      } else if (error.message.includes('MetaMask')) {
        errorMessage = '请安装 MetaMask 钱包';
      } else {
        errorMessage = error.message;
      }

      setError(errorMessage);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // 加载市场NFT
  const loadMarketNFTs = async () => {
    try {
      setError('');
      console.log('🔄 加载市场NFT...');
      const listedNFTs = await getListedNFTs();
      console.log('✅ 加载到NFT数量:', listedNFTs.length);
      setNfts(listedNFTs);
    } catch (err) {
      console.error('加载市场NFT失败:', err);
      setError('加载市场NFT失败: ' + err.message);
    }
  };

  // 获取白名单签名
  const fetchWhitelistSignature = async (tokenId) => {
    try {
      // 确保有有效的地址
      let effectiveAddress = currentAddress;
      if (!effectiveAddress) {
        effectiveAddress = await connectWallet();
      }

      if (!effectiveAddress) {
        throw new Error('请先连接钱包');
      }

      console.log('📨 请求白名单签名...');
      console.log('用户地址:', effectiveAddress);
      console.log('NFT ID:', tokenId);

      const requestData = {
        userAddress: effectiveAddress,
        nftId: parseInt(tokenId),
        maxPrice: "200000000000000000", // 0.2 ETH
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
        tierLevel: "GOLD"
      };

      console.log('请求数据:', requestData);

      const response = await fetch('http://localhost:8081/api/whitelist/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP错误详情:', errorText);
        throw new Error(`后端请求失败: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ 后端响应:', result);

      if (result.success && result.data) {
        console.log('🎫 签名获取成功!');
        console.log('Signature:', result.data.signature);
        console.log('MaxPrice:', result.data.maxPrice);
        console.log('Deadline:', result.data.deadline);
        console.log('Nonce:', result.data.nonce);

        return {
          maxPrice: result.data.maxPrice,
          deadline: result.data.deadline,
          signature: result.data.signature,
          nonce: result.data.nonce
        };
      } else {
        throw new Error(result.message || '获取白名单签名失败');
      }

    } catch (error) {
      console.error('❌ 获取白名单签名失败:', error);
      throw new Error(`白名单签名获取失败: ${error.message}`);
    }
  };

  // 白名单购买NFT
  const handleBuyNFT = async (tokenId) => {
    try {
      setError('');
      setPurchasingTokenId(tokenId);

      console.log('=== 开始白名单购买流程 ===');
      console.log('购买NFT ID:', tokenId);

      // 确认购买
      const confirmed = window.confirm(`确定要使用白名单购买 NFT #${tokenId} 吗？`);
      if (!confirmed) {
        console.log('用户取消了购买');
        return;
      }

      // 1. 获取白名单签名
      console.log('步骤1: 获取白名单签名...');
      const whitelistData = await fetchWhitelistSignature(tokenId);

      if (!whitelistData || !whitelistData.signature) {
        throw new Error('无法获取有效的白名单签名');
      }

      // 2. 执行白名单购买
      console.log('步骤2: 执行白名单购买...');
      console.log('调用参数:', {
        tokenId,
        maxPrice: whitelistData.maxPrice,
        deadline: whitelistData.deadline,
        nonce: whitelistData.nonce,
        signature: whitelistData.signature
      });

      const result = await permitBuy(
        parseInt(tokenId),
        whitelistData.maxPrice,
        whitelistData.deadline,
        whitelistData.signature,
        whitelistData.nonce
      );

      if (result) {
        console.log('🎉 白名单购买成功!');
        alert('🎉 白名单购买成功！');
        await loadMarketNFTs(); // 刷新列表
      }

    } catch (err) {
      console.error('❌ 购买失败:', err);
      setError('购买失败: ' + err.message);
    } finally {
      setPurchasingTokenId(null);
    }
  };

  // 手动输入签名购买（测试用）
  const handleManualSignatureBuy = (nft) => {
    setSelectedNFT(nft);
    setShowSignatureModal(true);
    setSignature('');
  };

  const handleManualBuy = async () => {
    if (!selectedNFT || !signature.trim()) {
      setError('请输入有效的签名');
      return;
    }

    try {
      setError('');
      setPurchasingTokenId(selectedNFT.tokenId);
      setShowSignatureModal(false);

      console.log('🛒 手动签名购买...');

      // 使用默认参数
      const defaultParams = {
        maxPrice: "200000000000000000",
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: Date.now()
      };

      const result = await permitBuy(
        parseInt(selectedNFT.tokenId),
        signature.trim(),
        defaultParams.maxPrice,
        defaultParams.deadline,
        defaultParams.nonce
      );

      if (result) {
        alert('🎉 手动签名购买成功！');
        await loadMarketNFTs();
      }
    } catch (err) {
      console.error('手动购买失败:', err);
      setError('购买失败: ' + err.message);
    } finally {
      setPurchasingTokenId(null);
      setSelectedNFT(null);
      setSignature('');
    }
  };

  // 刷新市场
  const handleRefresh = () => {
    loadMarketNFTs();
  };

  if (!isInitialized) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>初始化合约中...</p>
        {!currentAddress && (
          <button onClick={connectWallet} className="connect-btn">
            {isConnecting ? '连接中...' : '连接钱包'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="nft-market">
      <div className="page-header">
        <div className="header-top">
          <h2>🎨 NFT 市场（白名单版）</h2>
          <div className="header-actions">
            <button onClick={handleRefresh} className="refresh-btn" disabled={loading}>
              🔄 刷新
            </button>
          </div>
        </div>

        <p>仅限白名单用户购买 - 需要项目方授权签名</p>

        {/* 钱包状态 */}
        <div className="wallet-status">
          {currentAddress ? (
            <div className="connected-wallet">
              <span className="status-indicator connected">●</span>
              <span>已连接: {currentAddress.slice(0, 6)}...{currentAddress.slice(-4)}</span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="connect-wallet-btn"
              disabled={isConnecting}
            >
              {isConnecting ? '连接中...' : '🔗 连接钱包'}
            </button>
          )}
        </div>

        <div className="whitelist-notice">
          <span className="notice-icon">🔐</span>
          <span>此市场仅对白名单用户开放，购买需要项目方签名授权</span>
        </div>
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
            <p>市场上还没有NFT上架，或者加载失败</p>
            <button onClick={handleRefresh} className="retry-btn">
              重新加载
            </button>
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
                  <div className="whitelist-badge">白名单专属</div>
                </div>
              </div>

              <div className="nft-info">
                <h3 className="nft-name">{nft.name}</h3>
                <p className="nft-description">{nft.description}</p>

                <div className="nft-details">
                  <div className="seller-info">
                    <span className="label">卖家:</span>
                    <span className="address">
                      {nft.seller?.slice(0, 6)}...{nft.seller?.slice(-4)}
                    </span>
                  </div>

                  <div className="price-info">
                    <span className="label">价格:</span>
                    <span className="price">{nft.price} ETH</span>
                  </div>
                </div>

                <div className="buy-buttons">
                  <button
                    onClick={() => handleBuyNFT(nft.tokenId)}
                    disabled={loading && purchasingTokenId === nft.tokenId}
                    className={`buy-button primary ${loading && purchasingTokenId === nft.tokenId ? 'loading' : ''}`}
                  >
                    {loading && purchasingTokenId === nft.tokenId ? (
                      <>
                        <div className="button-spinner"></div>
                        购买中...
                      </>
                    ) : (
                      <>
                        <span className="button-icon">🔐</span>
                        白名单购买
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleManualSignatureBuy(nft)}
                    className="buy-button secondary"
                    disabled={loading}
                  >
                    <span className="button-icon">✍️</span>
                    手动输入签名
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 手动签名输入模态框 */}
      {showSignatureModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>手动输入白名单签名</h3>
            <p>请输入为 NFT #{selectedNFT?.tokenId} 生成的白名单签名：</p>

            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="在此粘贴签名数据 (0x...)"
              className="signature-input"
              rows="4"
            />

            <div className="modal-actions">
              <button
                onClick={handleManualBuy}
                disabled={!signature.trim() || loading}
                className="confirm-button"
              >
                {loading ? '购买中...' : '确认购买'}
              </button>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="cancel-button"
                disabled={loading}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTMarket;