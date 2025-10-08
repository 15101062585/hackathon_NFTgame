// src/App.jsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import NFTMarket from './components/NFTMarket';
import ListNFT from './components/ListNFT';
import MyNFTs from './components/MyNFTs';
import './styles/globals.css';
import walletConnect from './config/walletConnect';

function App() {
  const [activeTab, setActiveTab] = useState('market');
  const [userAddress, setUserAddress] = useState('');
  const [walletType, setWalletType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  // 处理标签切换
  const handleTabChange = (tab) => {
    console.log('切换到标签:', tab);
    setActiveTab(tab);
    setConnectionError('');
  };

  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        setIsLoading(true);
        setConnectionError('');

        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
          throw new Error('没有获取到账户地址');
        }

        setUserAddress(accounts[0]);
        setWalletType('metamask');
        console.log('✅ MetaMask 连接成功:', accounts[0]);
      } catch (error) {
        console.error('MetaMask 连接失败:', error);
        setConnectionError(`MetaMask 连接失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      setConnectionError('请安装 MetaMask! https://metamask.io/');
    }
  };

  // 在 App.jsx 中更新 connectWalletConnect 函数
  // 在 App.jsx 中修复 connectWalletConnect 函数
const connectWalletConnect = async () => {
  try {
    setIsLoading(true);
    setConnectionError('');
    
    console.log('开始 WalletConnect 连接流程...');
    
    // 执行连接
    const result = await walletConnect.connect();
    
    if (!result || !result.address) {
      throw new Error('未能获取到有效的钱包地址');
    }
    
    setUserAddress(result.address);
    setWalletType('walletconnect');
    console.log('✅ WalletConnect 连接成功:', result.address);
    
    // 重新初始化合约以使用新的连接
    await initializeContracts();
    
    // 设置事件监听
    walletConnect.onAccountsChanged((accounts) => {
      console.log('账户变化:', accounts);
      if (accounts && accounts.length > 0) {
        setUserAddress(accounts[0]);
      } else {
        disconnectWallet();
      }
    });
    
    walletConnect.onChainChanged((chainId) => {
      console.log('网络切换:', chainId);
      if (chainId !== 11155111) {
        setConnectionError('请切换到 Sepolia 测试网络');
      }
    });
    
  } catch (error) {
    console.error('WalletConnect 连接失败:', error);
    setConnectionError(`WalletConnect 连接失败: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  const disconnectWallet = () => {
    try {
      if (walletType === 'walletconnect') {
        walletConnect.disconnect();
      }
      setUserAddress('');
      setWalletType('');
      setConnectionError('');
      console.log('🔌 钱包已断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  };

  // 自动重连
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && walletType === 'metamask') {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0 && !userAddress) {
            setUserAddress(accounts[0]);
            setWalletType('metamask');
          }
        } catch (error) {
          console.error('自动重连失败:', error);
        }
      }
    };

    checkConnection();
  }, [userAddress, walletType]);

  return (
    <div className="app">
      <Header
        userAddress={userAddress}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onConnectWallet={connectMetaMask}
        onConnectWalletConnect={connectWalletConnect}
        onDisconnect={disconnectWallet}
        walletType={walletType}
        isLoading={isLoading}
      />

      {/* 连接错误提示 */}
      {connectionError && (
        <div className="connection-error">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{connectionError}</span>
            <button
              className="error-close"
              onClick={() => setConnectionError('')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'market' && <NFTMarket userAddress={userAddress} />}
        {activeTab === 'list' && <ListNFT userAddress={userAddress} />}
        {activeTab === 'myNFTs' && <MyNFTs userAddress={userAddress} />}
      </main>

      {/* 钱包连接引导 */}
      {!userAddress && (
        <div className="wallet-guide">
          <div className="wallet-guide-content">
            <h2>🚀 开始你的 NFT 之旅</h2>
            <p>连接钱包来探索、交易和收藏独特的数字艺术品</p>

            {/* 连接状态指示器 */}
            {isLoading && (
              <div className="connection-loading">
                <div className="spinner"></div>
                <p>正在连接钱包...</p>
              </div>
            )}

            <div className="wallet-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>选择钱包类型</h3>
                  <p>桌面浏览器推荐 MetaMask，移动端推荐 WalletConnect</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>确保网络正确</h3>
                  <p>请切换到 Sepolia 测试网络</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>授权连接</h3>
                  <p>在钱包中确认连接请求</p>
                </div>
              </div>
            </div>

            <div className="wallet-options">
              <div
                className={`wallet-option ${isLoading ? 'disabled' : ''}`}
                onClick={connectMetaMask}
              >
                <div className="wallet-icon">🦊</div>
                <div className="wallet-info">
                  <h3>MetaMask</h3>
                  <p>推荐桌面使用 - 最流行的以太坊钱包</p>
                </div>
              </div>
              <div
                className={`wallet-option ${isLoading ? 'disabled' : ''}`}
                onClick={connectWalletConnect}
              >
                <div className="wallet-icon">📱</div>
                <div className="wallet-info">
                  <h3>WalletConnect</h3>
                  <p>支持移动端钱包 - 扫描二维码连接</p>
                </div>
              </div>
            </div>

            {/* 故障排除提示 */}
            <div className="troubleshooting">
              <h4>遇到问题？</h4>
              <ul>
                <li>确保钱包应用已安装并解锁</li>
                <li>检查网络连接是否正常</li>
                <li>WalletConnect 需要扫描二维码</li>
                <li>确保选择了正确的网络 (Sepolia)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}

export default App;