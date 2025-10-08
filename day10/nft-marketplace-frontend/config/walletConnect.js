// src/config/walletConnect.js
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers'

// 项目配置
const projectId = 'efe40d7ce9ef2020a61fb47c0abb913e'

// Sepolia 网络配置
const sepolia = {
  chainId: 11155111,
  name: 'Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://sepolia.infura.io/v3/f30e6c1b7e74434e8a28fba71d8f6331'
}

// 元数据
const metadata = {
  name: 'NFT Marketplace',
  description: 'NFT Marketplace DApp',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Ethers 配置
const ethersConfig = defaultConfig({
  metadata,
  enableEAP6963: true,
  enableInjected: true,
  enableCoinbase: true,
  rpcUrl: sepolia.rpcUrl,
  defaultChainId: 11155111
})

class WalletConnectService {
  constructor() {
    this.modal = null;
    this.provider = null;
    this.init();
  }

  async init() {
    try {
      if (!projectId || projectId === 'YOUR_PROJECT_ID') {
        throw new Error('请配置正确的 WalletConnect 项目ID');
      }

      console.log('初始化 Web3Modal...');
      
      // 创建 Web3Modal 实例
      this.modal = createWeb3Modal({
        ethersConfig,
        chains: [sepolia],
        projectId,
        enableAnalytics: false,
        themeMode: 'light',
        themeVariables: {
          '--w3m-accent': '#667eea'
        }
      });

      console.log('Web3Modal 初始化成功');
      
      // 监听连接状态变化
      this.setupEventListeners();
      
    } catch (error) {
      console.error('WalletConnect 初始化失败:', error);
    }
  }

  setupEventListeners() {
    // 监听连接事件
    this.modal.subscribeEvents((event) => {
      console.log('Web3Modal 事件:', event);
      
      switch (event.name) {
        case 'CONNECT_SUCCESS':
          console.log('连接成功:', event.data);
          break;
        case 'DISCONNECT_SUCCESS':
          console.log('断开连接成功');
          break;
        case 'ACCOUNTS_CHANGED':
          console.log('账户变化:', event.data);
          break;
        case 'CHAIN_CHANGED':
          console.log('网络变化:', event.data);
          break;
      }
    });
  }

  async connect() {
    try {
      console.log('开始 WalletConnect 连接...');

      if (!this.modal) {
        throw new Error('Web3Modal 未正确初始化');
      }

      // 打开连接模态框
      await this.modal.open();

      // 等待连接完成
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('连接超时，请重试'));
        }, 30000); // 30秒超时

        const unsubscribe = this.modal.subscribeEvents((event) => {
          if (event.name === 'CONNECT_SUCCESS') {
            clearTimeout(timeout);
            unsubscribe();
            
            // 获取连接信息
            const address = this.getAddress();
            const chainId = this.getChainId();
            
            if (!address) {
              reject(new Error('未能获取到钱包地址'));
              return;
            }

            resolve({
              address,
              chainId
            });
          } else if (event.name === 'MODAL_CLOSE') {
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error('用户取消了连接'));
          }
        });
      });

    } catch (error) {
      console.error('WalletConnect 连接失败:', error);
      
      let errorMessage = '连接失败';
      if (error.message.includes('User rejected')) {
        errorMessage = '用户拒绝了连接请求';
      } else if (error.message.includes('timeout')) {
        errorMessage = '连接超时，请重试';
      } else if (error.message.includes('未正确初始化')) {
        errorMessage = '钱包服务未正确初始化';
      } else {
        errorMessage = `连接失败: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async disconnect() {
    try {
      if (this.modal) {
        await this.modal.disconnect();
        console.log('WalletConnect 断开连接成功');
      }
    } catch (error) {
      console.error('断开连接失败:', error);
      throw error;
    }
  }

  getAddress() {
    try {
      // 从 Web3Modal 获取当前地址
      const walletInfo = this.modal.getWalletInfo();
      return walletInfo?.addresses?.[0] || null;
    } catch (error) {
      console.error('获取地址失败:', error);
      return null;
    }
  }

  getChainId() {
    try {
      const walletInfo = this.modal.getWalletInfo();
      return walletInfo?.chainId || null;
    } catch (error) {
      console.error('获取链ID失败:', error);
      return null;
    }
  }

  onAccountsChanged(callback) {
    if (this.modal) {
      this.modal.subscribeEvents((event) => {
        if (event.name === 'ACCOUNTS_CHANGED') {
          callback(event.data || []);
        }
      });
    }
  }

  onChainChanged(callback) {
    if (this.modal) {
      this.modal.subscribeEvents((event) => {
        if (event.name === 'CHAIN_CHANGED') {
          callback(event.data);
        }
      });
    }
  }

  async checkConnection() {
    try {
      const address = this.getAddress();
      return !!address;
    } catch (error) {
      return false;
    }
  }

  getClient() {
    return this.modal;
  }
}

// 创建单例实例
const walletConnect = new WalletConnectService();

// 导出实例和工具函数
export default walletConnect;

// 工具函数：检查是否在移动设备上
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 工具函数：获取推荐的连接方式
export const getRecommendedConnection = () => {
  return isMobile() ? 'walletconnect' : 'metamask';
};