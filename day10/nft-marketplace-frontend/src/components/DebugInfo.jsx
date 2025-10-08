// src/components/DebugInfo.jsx
import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';

const DebugInfo = ({ userAddress }) => {
  const [debugInfo, setDebugInfo] = useState('');
  const [nftCount, setNftCount] = useState(0);
  const { getNFTContract, getMarketContract } = useContract();

  const runDebug = async () => {
    setDebugInfo('开始调试...\n');
    
    try {
      if (!userAddress) {
        setDebugInfo(prev => prev + '❌ 用户未连接钱包\n');
        return;
      }

      setDebugInfo(prev => prev + `用户地址: ${userAddress}\n`);

      // 检查网络
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setDebugInfo(prev => prev + `当前网络 ChainID: ${chainId}\n`);
      }

      // 检查合约地址
      setDebugInfo(prev => prev + `NFT合约地址: ${CONTRACT_ADDRESSES.NFT}\n`);
      setDebugInfo(prev => prev + `市场合约地址: ${CONTRACT_ADDRESSES.NFTMarket}\n`);

      const nftContract = getNFTContract();
      const marketContract = getMarketContract();

      if (!nftContract) {
        setDebugInfo(prev => prev + '❌ NFT合约未初始化\n');
        return;
      }

      // 检查合约连接
      try {
        const nftAddress = await nftContract.getAddress();
        setDebugInfo(prev => prev + `✅ NFT合约连接成功: ${nftAddress}\n`);
      } catch (error) {
        setDebugInfo(prev => prev + `❌ NFT合约连接失败: ${error.message}\n`);
      }

      // 检查用户 NFT 余额
      try {
        const balance = await nftContract.balanceOf(userAddress);
        setDebugInfo(prev => prev + `用户NFT余额: ${balance.toString()}\n`);
        setNftCount(parseInt(balance.toString()));
      } catch (error) {
        setDebugInfo(prev => prev + `❌ 获取余额失败: ${error.message}\n`);
      }

      // 扫描前20个NFT的所有权
      setDebugInfo(prev => prev + '\n扫描NFT所有权...\n');
      let foundCount = 0;
      
      for (let i = 1; i <= 20; i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            setDebugInfo(prev => prev + `✅ NFT #${i} 属于用户\n`);
            foundCount++;
            
            // 检查上架状态
            try {
              if (marketContract) {
                const listing = await marketContract.listings(i);
                setDebugInfo(prev => prev + `  - 上架状态: ${listing.isListed ? '已上架' : '未上架'}\n`);
              }
            } catch (error) {
              setDebugInfo(prev => prev + `  - 上架检查失败: ${error.message}\n`);
            }
          } else {
            setDebugInfo(prev => prev + `❌ NFT #${i} 不属于用户，所有者: ${owner.slice(0, 10)}...\n`);
          }
        } catch (error) {
          setDebugInfo(prev => prev + `❌ NFT #${i} 不存在: ${error.message}\n`);
        }
      }
      
      setDebugInfo(prev => prev + `\n扫描完成，找到 ${foundCount} 个用户拥有的NFT\n`);

    } catch (error) {
      setDebugInfo(prev => prev + `❌ 调试过程出错: ${error.message}\n`);
    }
  };

  return (
    <div className="debug-info">
      <h3>调试信息</h3>
      <button onClick={runDebug} className="debug-btn">
        运行调试
      </button>
      <div className="debug-result">
        <pre>{debugInfo}</pre>
      </div>
    </div>
  );
};

export default DebugInfo;