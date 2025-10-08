// src/hooks/useWeb3.js
import { useState, useEffect } from 'react';

export const useWeb3 = () => {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);

  // 检查是否已连接钱包
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('检查连接状态失败:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        setIsConnected(true);
        return accounts[0];
      } catch (error) {
        console.error('连接钱包失败:', error);
        throw error;
      }
    } else {
      throw new Error('请安装 MetaMask!');
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setIsConnected(false);
    setProvider(null);
  };

  // 监听账户变化
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  return {
    account,
    isConnected,
    connectWallet,
    disconnectWallet,
    provider
  };
};

// 获取以太坊余额
export const useBalance = (account) => {
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    const fetchBalance = async () => {
      if (account && window.ethereum) {
        try {
          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [account, 'latest']
          });
          // 将 wei 转换为 ETH
          const ethBalance = parseInt(balance) / 1e18;
          setBalance(ethBalance.toFixed(4));
        } catch (error) {
          console.error('获取余额失败:', error);
        }
      }
    };

    fetchBalance();
  }, [account]);

  return balance;
};