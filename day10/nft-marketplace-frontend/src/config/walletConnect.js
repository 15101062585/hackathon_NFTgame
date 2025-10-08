// src/config/walletConnect.js
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { ethers } from 'ethers';

// 确保 global 在浏览器环境中可用
if (typeof global === 'undefined') {
  window.global = window;
}

const projectId = '3M3sRVkzLgCUM1mS617LWiQGwAK15Q6A';

class WalletConnectService {
  constructor() {
    this.provider = null;
    this.ethersProvider = null;
    this.signer = null;
    this.isConnecting = false;
  }

  async init() {
    try {
      if (!projectId) {
        throw new Error('请配置 WalletConnect 项目ID');
      }

      console.log('初始化 WalletConnect...');
      
      // 使用更简单的配置
      this.provider = await EthereumProvider.init({
        projectId,
        chains: [11155111],
        showQrModal: true,
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
        ],
        events: ['chainChanged', 'accountsChanged'],
      });

      console.log('WalletConnect 初始化成功');
      
    } catch (error) {
      console.error('WalletConnect 初始化失败:', error);
      throw error;
    }
  }

  async connect() {
    try {
      if (this.isConnecting) {
        throw new Error('正在连接中，请稍候');
      }

      this.isConnecting = true;
      console.log('开始 WalletConnect 连接...');

      // 确保已初始化
      if (!this.provider) {
        await this.init();
      }

      // 如果已连接，先断开
      if (this.provider.connected) {
        await this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 发起连接
      await this.provider.connect();

      // 获取账户
      const accounts = await this.provider.request({
        method: 'eth_accounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('未能获取到账户地址');
      }

      // 创建 ethers provider
      this.ethersProvider = new ethers.BrowserProvider(this.provider);
      this.signer = await this.ethersProvider.getSigner();

      console.log('WalletConnect 连接成功:', {
        address: accounts[0],
        chainId: this.provider.chainId
      });

      this.isConnecting = false;
      
      return {
        address: accounts[0],
        chainId: this.provider.chainId
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('WalletConnect 连接失败:', error);
      
      let errorMessage = '连接失败';
      if (error.message.includes('User rejected')) {
        errorMessage = '用户拒绝了连接请求';
      } else if (error.message.includes('Session settled')) {
        errorMessage = '连接已存在';
      } else {
        errorMessage = `连接失败: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async disconnect() {
    try {
      if (this.provider && this.provider.connected) {
        await this.provider.disconnect();
      }
    } catch (error) {
      console.error('断开连接失败:', error);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    this.provider = null;
    this.ethersProvider = null;
    this.signer = null;
    this.isConnecting = false;
    console.log('WalletConnect 清理完成');
  }

  onAccountsChanged(callback) {
    if (this.provider) {
      this.provider.on('accountsChanged', (accounts) => {
        console.log('账户变化:', accounts);
        callback(accounts);
      });
    }
  }

  onChainChanged(callback) {
    if (this.provider) {
      this.provider.on('chainChanged', (chainId) => {
        console.log('网络变化:', chainId);
        callback(parseInt(chainId));
      });
    }
  }

  async checkConnection() {
    try {
      return this.provider ? this.provider.connected : false;
    } catch (error) {
      return false;
    }
  }

  getSigner() {
    return this.signer;
  }

  getProvider() {
    return this.ethersProvider;
  }

  getClient() {
    return {
      connected: this.provider ? this.provider.connected : false,
      provider: this.provider,
      ethersProvider: this.ethersProvider,
      getSigner: () => this.signer
    };
  }
}

const walletConnect = new WalletConnectService();
export default walletConnect;