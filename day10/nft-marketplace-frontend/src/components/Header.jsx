import React, { useState } from 'react';

const Header = ({ 
  userAddress, 
  activeTab, 
  onTabChange, 
  onConnectWallet, 
  onConnectWalletConnect, 
  onDisconnect, 
  walletType,
  isLoading = false
}) => {
  const [error, setError] = useState(null);

  // 截断地址显示
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 处理标签切换 - 添加更安全的错误处理
  const handleTabChange = (tab) => {
    setError(null);
    
    // 检查 onTabChange 是否存在且是函数
    if (typeof onTabChange === 'function') {
      try {
        onTabChange(tab);
      } catch (err) {
        console.error('切换标签时出错:', err);
        setError(`切换标签失败: ${err.message}`);
      }
    } else {
      console.error('onTabChange 不是函数:', onTabChange);
      setError('页面切换功能暂不可用');
    }
  };

  // 安全的函数调用包装器
  const safeCall = (fn, ...args) => {
    if (typeof fn === 'function') {
      try {
        return fn(...args);
      } catch (err) {
        console.error('函数调用失败:', err);
        setError('操作失败，请重试');
        return null;
      }
    } else {
      console.error('函数未定义:', fn);
      setError('功能暂不可用');
      return null;
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <h1>NFT Marketplace</h1>
        </div>
        
        <nav className="header-nav">
          <button 
            className={`nav-button ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => handleTabChange('market')}
            disabled={isLoading}
          >
            {isLoading && activeTab === 'market' ? '加载中...' : '市场'}
          </button>
          <button 
            className={`nav-button ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleTabChange('list')}
            disabled={isLoading}
          >
            {isLoading && activeTab === 'list' ? '加载中...' : '上架NFT'}
          </button>
          <button 
            className={`nav-button ${activeTab === 'myNFTs' ? 'active' : ''}`}
            onClick={() => handleTabChange('myNFTs')}
            disabled={isLoading || !userAddress}
          >
            {!userAddress ? '请先连接钱包' : 
             isLoading && activeTab === 'myNFTs' ? '加载中...' : '我的NFT'}
          </button>
        </nav>
        
        <div className="header-wallet">
          {userAddress ? (
            <div className="wallet-connected">
              <div className="wallet-address">
                {walletType === 'walletconnect' ? (
                  <span className="wallet-icon">🔌</span>
                ) : (
                  <span className="wallet-icon">🦊</span>
                )}
                <span>{truncateAddress(userAddress)}</span>
              </div>
              <button 
                className="disconnect-button"
                onClick={() => safeCall(onDisconnect)}
                disabled={isLoading}
              >
                断开连接
              </button>
            </div>
          ) : (
            <div className="wallet-connect-options">
              <button 
                className="connect-button metamask-button"
                onClick={() => safeCall(onConnectWallet)}
                disabled={isLoading}
              >
                <span className="wallet-icon">🦊</span>
                连接MetaMask
              </button>
              <button 
                className="connect-button walletconnect-button"
                onClick={() => safeCall(onConnectWalletConnect)}
                disabled={isLoading}
              >
                <span className="wallet-icon">🔌</span>
                连接WalletConnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
              className="error-close"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1rem;
        }

        .header-logo h1 {
          color: white;
          margin: 0;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .header-nav {
          display: flex;
          gap: 1rem;
        }

        .nav-button {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-button:hover:not(:disabled) {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        .nav-button.active {
          background: rgba(255,255,255,0.3);
          border-color: rgba(255,255,255,0.4);
        }

        .nav-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .header-wallet {
          display: flex;
          align-items: center;
        }

        .wallet-connect-options {
          display: flex;
          gap: 0.5rem;
        }

        .connect-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .metamask-button {
          background: #f6851b;
          color: white;
        }

        .walletconnect-button {
          background: #3b99fc;
          color: white;
        }

        .connect-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wallet-connected {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .wallet-address {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.1);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          color: white;
          font-family: monospace;
        }

        .wallet-icon {
          font-size: 1.2rem;
        }

        .disconnect-button {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .disconnect-button:hover:not(:disabled) {
          background: rgba(255,255,255,0.3);
        }

        .disconnect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-banner {
          background: #f56565;
          color: white;
          padding: 0.5rem 0;
        }

        .error-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 1rem;
        }

        .error-close {
          background: none;
          border: none;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          margin-left: auto;
        }

        @media (max-width: 768px) {
          .header-container {
            flex-direction: column;
            gap: 1rem;
          }

          .header-nav {
            order: 3;
          }

          .wallet-connect-options {
            flex-direction: column;
          }
        }
      `}</style>
    </header>
  );
};
// 在 Header 组件定义之后添加
Header.defaultProps = {
  userAddress: '',
  activeTab: 'market',
  onTabChange: () => console.warn('onTabChange 未定义'),
  onConnectWallet: () => console.warn('onConnectWallet 未定义'),
  onConnectWalletConnect: () => console.warn('onConnectWalletConnect 未定义'),
  onDisconnect: () => console.warn('onDisconnect 未定义'),
  walletType: '',
  isLoading: false
};
export default Header;