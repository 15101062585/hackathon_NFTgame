// src/hooks/useContract.js
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import walletConnect from '../config/walletConnect';

// 合约地址
const NFT_ADDRESS = '0xEd663faC23dD5D2914E48493fc43639E46C721F3';
const MARKET_ADDRESS = '0xdb819529f72568472e9b5857741171A4F4AC3258';
const ERC20_ADDRESS = '0x5F97a3a99B590D93fF798b7dCE5E917d4eEd8778';

// 链ID（Sepolia测试网）
const CHAIN_ID = 11155111;

// NFT合约 ABI
const NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(address to, string memory tokenURI) public returns (uint256)",
  "function approve(address to, uint256 tokenId) public",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId) public",
  "function balanceOf(address owner) view returns (uint256)"
];

// 市场合约 ABI
const MARKET_ABI = [
  "function nftContract() view returns (address)",
  "function tokenContract() view returns (address)",
  "function listings(uint256) view returns (address seller, uint256 price, bool isListed)",
  "function list(uint256 _tokenId, uint256 _price) external",
  "function buyNFT(uint256 _tokenId) external",
  "function tokensReceived(address _from, address _to, uint256 _value, bytes calldata _data) external returns (bool)",
  "function cancelListing(uint256 _tokenId) external",
  "event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp)",
  "event NFTBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp)",
  "event NFTCancelled(uint256 indexed tokenId, address indexed seller, uint256 timestamp)"
];

// ERC20 代币合约 ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferWithCallback(address _to, uint256 _value, bytes calldata _data) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// 缓存机制
const cache = {
  listedNFTs: null,
  userNFTs: new Map(),
  lastFetch: new Map(),
  metadata: new Map()
};

// 批量处理工具
const batchProcessor = {
  async processBatch(tasks, batchSize = 5) {
    const results = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    return results;
  },

  async batchGetListings(marketContract, tokenIds) {
    const tasks = tokenIds.map(tokenId => 
      marketContract.listings(tokenId).catch(() => null)
    );
    const results = await this.processBatch(tasks, 3);
    return results.map((result, index) => ({
      tokenId: tokenIds[index],
      listing: result.status === 'fulfilled' ? result.value : null
    }));
  },

  async batchGetOwners(nftContract, tokenIds) {
    const tasks = tokenIds.map(tokenId => 
      nftContract.ownerOf(tokenId).catch(() => null)
    );
    const results = await this.processBatch(tasks, 3);
    return results.map((result, index) => ({
      tokenId: tokenIds[index],
      owner: result.status === 'fulfilled' ? result.value : null
    }));
  },

  async batchGetMetadata(nftContract, tokenIds) {
    const tasks = tokenIds.map(async (tokenId) => {
      if (cache.metadata.has(tokenId)) {
        return { tokenId, metadata: cache.metadata.get(tokenId) };
      }

      try {
        const tokenURI = await nftContract.tokenURI(tokenId);
        let metadata = { 
          name: `NFT #${tokenId}`, 
          description: '独特的数字艺术品', 
          image: '' 
        };
        
        try {
          const response = await fetch(tokenURI);
          if (response.ok) {
            metadata = await response.json();
          }
        } catch {
          metadata.image = `https://picsum.photos/400/400?random=${tokenId}`;
        }

        cache.metadata.set(tokenId, metadata);
        return { tokenId, metadata };
      } catch {
        const fallbackMetadata = {
          name: `NFT #${tokenId}`,
          description: '元数据获取失败',
          image: `https://picsum.photos/400/400?random=${tokenId}`
        };
        cache.metadata.set(tokenId, fallbackMetadata);
        return { tokenId, metadata: fallbackMetadata };
      }
    });

    const results = await this.processBatch(tasks, 2);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean);
  }
};

export const useContract = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);
  const [erc20Contract, setErc20Contract] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  const getContract = useCallback((address, abi, signerOrProvider) => {
    return new ethers.Contract(address, abi, signerOrProvider);
  }, []);

  // 初始化合约
  // 在 useContract.js 中修复 initializeContracts 函数
// 在 useContract.js 中修复 WalletConnect 处理逻辑
const initializeContracts = useCallback(async () => {
  try {
    setLoading(true);
    console.log('开始初始化合约...');

    let ethersProvider = null;
    let ethersSigner = null;

    // 检查 WalletConnect 连接状态
    const walletConnectClient = walletConnect.getClient();
    console.log('WalletConnect 连接状态:', walletConnectClient.connected);

    if (walletConnectClient.connected) {
      console.log('使用 WalletConnect 连接');
      try {
        // 使用 WalletConnect 的 provider
        ethersProvider = walletConnect.getProvider();
        ethersSigner = walletConnect.getSigner();
        
        if (!ethersProvider) {
          throw new Error('无法获取 WalletConnect provider');
        }
        
        console.log('WalletConnect provider 获取成功');
        
        // 验证连接
        const connectionInfo = walletConnect.getConnectionInfo();
        console.log('WalletConnect 连接信息:', connectionInfo);
        
      } catch (wcError) {
        console.error('WalletConnect 连接失败:', wcError);
        // 回退到其他连接方式
      }
    }

    // 如果 WalletConnect 不可用，尝试 MetaMask
    if (!ethersProvider && window.ethereum) {
      console.log('尝试使用 MetaMask 连接');
      try {
        ethersProvider = new ethers.BrowserProvider(window.ethereum);
        
        // 检查是否有已连接的账户
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          ethersSigner = await ethersProvider.getSigner();
          console.log('MetaMask 已连接，地址:', accounts[0]);
        } else {
          console.log('MetaMask 未连接，使用只读模式');
        }
      } catch (mmError) {
        console.warn('MetaMask 连接失败:', mmError);
      }
    }

    // 如果都没有连接，使用公共 RPC（只读模式）
    if (!ethersProvider) {
      console.log('使用公共 RPC 连接（只读模式）');
      ethersProvider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/f30e6c1b7e74434e8a28fba71d8f6331');
    }

    setProvider(ethersProvider);
    setSigner(ethersSigner);

    // 创建合约实例
    console.log('创建合约实例...');
    const nft = getContract(NFT_ADDRESS, NFT_ABI, ethersSigner || ethersProvider);
    const market = getContract(MARKET_ADDRESS, MARKET_ABI, ethersSigner || ethersProvider);
    const erc20 = getContract(ERC20_ADDRESS, ERC20_ABI, ethersSigner || ethersProvider);

    // 简单验证合约（不阻止初始化）
    try {
      const nftName = await nft.name();
      console.log('NFT合约名称:', nftName);
    } catch (error) {
      console.warn('合约验证警告:', error);
    }

    setNftContract(nft);
    setMarketContract(market);
    setErc20Contract(erc20);
    setIsInitialized(true);
    
    console.log('🎉 合约初始化成功');

  } catch (error) {
    console.error('❌ 初始化合约失败:', error);
    
    // 设置只读模式作为降级方案
    try {
      const fallbackProvider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/f30e6c1b7e74434e8a28fba71d8f6331');
      setProvider(fallbackProvider);
      
      const nft = getContract(NFT_ADDRESS, NFT_ABI, fallbackProvider);
      const market = getContract(MARKET_ADDRESS, MARKET_ABI, fallbackProvider);
      const erc20 = getContract(ERC20_ADDRESS, ERC20_ABI, fallbackProvider);
      
      setNftContract(nft);
      setMarketContract(market);
      setErc20Contract(erc20);
      setIsInitialized(true);
      console.log('已降级到只读模式');
    } catch (fallbackError) {
      console.error('降级模式也失败:', fallbackError);
      setIsInitialized(false);
    }
  } finally {
    setLoading(false);
  }
}, [getContract]);

  // 监听钱包连接状态变化
  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        initializeContracts();
      }
    };

    const handleChainChanged = (chainId) => {
      initializeContracts();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    initializeContracts();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [initializeContracts]);

  // 通过事件获取活跃的tokenId
  const getActiveTokenIdsFromEvents = useCallback(async () => {
    if (!marketContract || !provider) {
      return [];
    }

    try {
      console.log('尝试通过事件日志获取活跃tokenId...');
      
      const blockNumber = await provider.getBlockNumber();
      const fromBlock = Math.max(0, blockNumber - 10000);
      
      const [listedEvents, cancelledEvents, boughtEvents] = await Promise.all([
        marketContract.queryFilter(marketContract.filters.NFTListed(), fromBlock),
        marketContract.queryFilter(marketContract.filters.NFTCancelled(), fromBlock),
        marketContract.queryFilter(marketContract.filters.NFTBought(), fromBlock)
      ]);

      const listedTokenIds = new Set(listedEvents.map(event => event.args.tokenId.toString()));
      const cancelledTokenIds = new Set(cancelledEvents.map(event => event.args.tokenId.toString()));
      const boughtTokenIds = new Set(boughtEvents.map(event => event.args.tokenId.toString()));

      cancelledTokenIds.forEach(tokenId => listedTokenIds.delete(tokenId));
      boughtTokenIds.forEach(tokenId => listedTokenIds.delete(tokenId));

      const activeTokenIds = Array.from(listedTokenIds).map(id => parseInt(id));
      console.log(`通过事件找到 ${activeTokenIds.length} 个活跃NFT`);
      
      return activeTokenIds;
    } catch (error) {
      console.warn('通过事件获取tokenId失败，使用扫描方式:', error);
      return [];
    }
  }, [marketContract, provider]);

  // 智能tokenId扫描
  const smartTokenIdScan = useCallback(async () => {
    if (!marketContract) return [];

    console.log('开始智能tokenId扫描...');
    const activeTokenIds = [];
    
    for (let tokenId = 1; tokenId <= 20; tokenId++) {
      try {
        const listing = await marketContract.listings(tokenId);
        if (listing.isListed) {
          activeTokenIds.push(tokenId);
        }
      } catch (error) {
        if (error.message.includes('nonexistent token')) {
          break;
        }
      }
    }

    if (activeTokenIds.length < 5) {
      for (let tokenId = 21; tokenId <= 50; tokenId++) {
        try {
          const listing = await marketContract.listings(tokenId);
          if (listing.isListed) {
            activeTokenIds.push(tokenId);
          }
        } catch (error) {
          if (error.message.includes('nonexistent token')) {
            break;
          }
        }
      }
    }

    console.log(`智能扫描找到 ${activeTokenIds.length} 个上架NFT`);
    return activeTokenIds;
  }, [marketContract]);

  // 获取所有已上架的NFT列表
  const getListedNFTs = useCallback(async () => {
    if (!marketContract || !nftContract) {
      throw new Error('合约未初始化');
    }

    try {
      setLoading(true);
      
      const now = Date.now();
      const cacheKey = 'listed';
      if (cache.listedNFTs && (now - (cache.lastFetch.get(cacheKey) || 0) < 2 * 60 * 1000)) {
        console.log('使用缓存的上架NFT数据');
        return cache.listedNFTs;
      }

      console.log('开始批量获取上架NFT...');
      
      let activeTokenIds = await getActiveTokenIdsFromEvents();
      
      if (activeTokenIds.length === 0) {
        activeTokenIds = await smartTokenIdScan();
      }

      if (activeTokenIds.length === 0) {
        cache.listedNFTs = [];
        cache.lastFetch.set(cacheKey, now);
        return [];
      }

      const [listingsResults, metadataResults] = await Promise.all([
        batchProcessor.batchGetListings(marketContract, activeTokenIds),
        batchProcessor.batchGetMetadata(nftContract, activeTokenIds)
      ]);

      const items = [];
      const metadataMap = new Map(metadataResults.map(item => [item.tokenId, item.metadata]));

      for (const result of listingsResults) {
        if (result.listing && result.listing.isListed) {
          const metadata = metadataMap.get(result.tokenId) || {
            name: `NFT #${result.tokenId}`,
            description: '独特的数字艺术品',
            image: `https://picsum.photos/400/400?random=${result.tokenId}`
          };

          items.push({
            tokenId: result.tokenId.toString(),
            seller: result.listing.seller,
            price: ethers.formatEther(result.listing.price),
            isListed: true,
            ...metadata
          });
        }
      }

      console.log(`批量获取到 ${items.length} 个上架NFT`);
      
      cache.listedNFTs = items;
      cache.lastFetch.set(cacheKey, now);
      
      return items;
    } catch (error) {
      console.error('获取上架NFT失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [marketContract, nftContract, getActiveTokenIdsFromEvents, smartTokenIdScan]);

  // 获取用户拥有的NFT
  const getUserNFTs = useCallback(async (userAddress) => {
    if (!marketContract || !nftContract || !userAddress) {
      throw new Error('合约未初始化或用户地址无效');
    }

    try {
      setLoading(true);
      
      const now = Date.now();
      const cacheKey = `user-${userAddress}`;
      if (cache.userNFTs.has(cacheKey) && 
          (now - (cache.lastFetch.get(cacheKey) || 0) < 2 * 60 * 1000)) {
        console.log('使用缓存的用户NFT数据');
        return cache.userNFTs.get(cacheKey);
      }

      console.log(`开始批量获取用户 ${userAddress} 的NFT...`);

      let userBalance = 0;
      try {
        userBalance = await nftContract.balanceOf(userAddress);
        console.log(`用户NFT余额: ${userBalance.toString()}`);
      } catch (error) {
        console.warn('获取用户余额失败:', error);
      }

      if (userBalance === 0) {
        cache.userNFTs.set(cacheKey, []);
        cache.lastFetch.set(cacheKey, now);
        return [];
      }

      const userTokenIds = [];
      const scanLimit = Math.min(50, Number(userBalance) * 10);

      const tokenIdsToCheck = Array.from({ length: scanLimit }, (_, i) => i + 1);
      const ownerResults = await batchProcessor.batchGetOwners(nftContract, tokenIdsToCheck);

      for (const result of ownerResults) {
        if (result.owner && result.owner.toLowerCase() === userAddress.toLowerCase()) {
          userTokenIds.push(result.tokenId);
        }
      }

      if (userTokenIds.length === 0) {
        cache.userNFTs.set(cacheKey, []);
        cache.lastFetch.set(cacheKey, now);
        return [];
      }

      const [listingsResults, metadataResults] = await Promise.all([
        batchProcessor.batchGetListings(marketContract, userTokenIds),
        batchProcessor.batchGetMetadata(nftContract, userTokenIds)
      ]);

      const items = [];
      const metadataMap = new Map(metadataResults.map(item => [item.tokenId, item.metadata]));

      for (let i = 0; i < userTokenIds.length; i++) {
        const tokenId = userTokenIds[i];
        const listing = listingsResults.find(r => r.tokenId === tokenId)?.listing;
        const isListed = listing ? listing.isListed : false;
        const metadata = metadataMap.get(tokenId) || {
          name: `NFT #${tokenId}`,
          description: '独特的数字艺术品',
          image: `https://picsum.photos/400/400?random=${tokenId}`
        };

        items.push({
          tokenId: tokenId.toString(),
          seller: isListed ? listing.seller : userAddress,
          owner: userAddress,
          price: isListed ? ethers.formatEther(listing.price) : '0',
          isListed: isListed,
          ...metadata
        });
      }

      console.log(`批量获取到用户 ${userAddress} 的 ${items.length} 个NFT`);
      
      cache.userNFTs.set(cacheKey, items);
      cache.lastFetch.set(cacheKey, now);
      
      return items;
    } catch (error) {
      console.error('获取用户NFT失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [marketContract, nftContract]);

  // 清除缓存
  const clearCache = useCallback(() => {
    cache.listedNFTs = null;
    cache.userNFTs.clear();
    cache.lastFetch.clear();
    console.log('缓存已清除');
  }, []);

 // 上架NFT
  const listNFT = useCallback(async (tokenId, price) => {
    if (!marketContract || !signer) {
      throw new Error('合约未初始化或未连接钱包');
    }

    try {
      setLoading(true);
      console.log(`上架NFT #${tokenId}, 价格: ${price} ETH`);

      // 首先检查用户是否拥有该NFT
      const owner = await nftContract.ownerOf(tokenId);
      const userAddress = await signer.getAddress();
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('您不是该NFT的所有者');
      }

      // 批准NFT转账给市场合约
      console.log('批准NFT转账...');
      const approveTx = await nftContract.approve(MARKET_ADDRESS, tokenId);
      await approveTx.wait();
      console.log('NFT批准成功');

      // 上架NFT（使用合约中的 list 函数）
      console.log('上架NFT...');
      const listTx = await marketContract.list(tokenId, ethers.parseEther(price));
      await listTx.wait();

      console.log(`NFT #${tokenId} 上架成功`);
      return true;
    } catch (error) {
      console.error('NFT上架失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [marketContract, nftContract, signer]);

  // 取消上架
  const cancelListing = useCallback(async (tokenId) => {
    if (!marketContract || !signer) {
      throw new Error('合约未初始化或未连接钱包');
    }

    try {
      setLoading(true);
      console.log(`取消上架NFT #${tokenId}`);

      // 取消上架（使用合约中的 cancelListing 函数）
      const cancelTx = await marketContract.cancelListing(tokenId);
      await cancelTx.wait();

      console.log(`NFT #${tokenId} 取消上架成功`);
      return true;
    } catch (error) {
      console.error('NFT取消上架失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [marketContract, signer]);

  // 购买NFT（使用代币支付）
  // 在 useContract.js 中修复 buyNFT 函数
const buyNFT = useCallback(async (tokenId) => {
  if (!marketContract || !signer || !erc20Contract) {
    throw new Error('合约未初始化或未连接钱包');
  }

  try {
    setLoading(true);
    console.log(`开始购买NFT #${tokenId}`);

    const userAddress = await signer.getAddress();
    console.log('用户地址:', userAddress);
    
    // 1. 获取NFT列表信息
    console.log('获取NFT列表信息...');
    const listing = await marketContract.listings(tokenId);
    console.log('列表信息:', listing);
    
    if (!listing.isListed) {
      throw new Error('该NFT未上架');
    }

    const price = listing.price;
    console.log(`NFT价格: ${ethers.formatEther(price)} ETH`);

    // 2. 检查用户代币余额
    console.log('检查代币余额...');
    const tokenBalance = await erc20Contract.balanceOf(userAddress);
    console.log('用户代币余额:', ethers.formatEther(tokenBalance));
    
    if (tokenBalance < price) {
      throw new Error(`代币余额不足。需要: ${ethers.formatEther(price)}，当前: ${ethers.formatEther(tokenBalance)}`);
    }

    // 3. 检查代币授权额度
    console.log('检查授权额度...');
    const allowance = await erc20Contract.allowance(userAddress, MARKET_ADDRESS);
    console.log('当前授权额度:', ethers.formatEther(allowance));
    
    if (allowance < price) {
      console.log('授权额度不足，开始授权...');
      
      // 授权代币给市场合约
      const approveTx = await erc20Contract.approve(MARKET_ADDRESS, price);
      console.log('授权交易已发送:', approveTx.hash);
      
      // 等待交易确认
      const approveReceipt = await approveTx.wait();
      console.log('授权交易已确认:', approveReceipt.status === 1 ? '成功' : '失败');
      
      if (approveReceipt.status !== 1) {
        throw new Error('代币授权失败');
      }
      
      console.log('代币授权成功');
    }

    // 4. 购买NFT
    console.log('开始购买NFT...');
    const buyTx = await marketContract.buyNFT(tokenId);
    console.log('购买交易已发送:', buyTx.hash);
    
    // 等待交易确认
    const buyReceipt = await buyTx.wait();
    console.log('购买交易已确认:', buyReceipt.status === 1 ? '成功' : '失败');
    
    if (buyReceipt.status !== 1) {
      throw new Error('NFT购买交易失败');
    }

    console.log(`NFT #${tokenId} 购买成功`);
    return true;
    
  } catch (error) {
    console.error('NFT购买失败:', error);
    
    // 提供更具体的错误信息
    let errorMessage = '购买失败';
    if (error.message.includes('user rejected')) {
      errorMessage = '用户拒绝了交易';
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = '燃料费不足';
    } else if (error.message.includes('execution reverted')) {
      errorMessage = '合约执行失败，请检查NFT状态';
    } else if (error.message.includes('nonce')) {
      errorMessage = '交易nonce错误，请重试';
    } else if (error.message.includes('代币余额不足')) {
      errorMessage = error.message;
    } else if (error.message.includes('未上架')) {
      errorMessage = error.message;
    } else {
      errorMessage = `购买失败: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  } finally {
    setLoading(false);
  }
}, [marketContract, erc20Contract, signer]);

  // 使用 transferWithCallback 购买NFT（高级功能）
  const buyNFTWithCallback = useCallback(async (tokenId) => {
    if (!marketContract || !signer || !erc20Contract) {
      throw new Error('合约未初始化或未连接钱包');
    }

    try {
      setLoading(true);
      console.log(`使用回调方式购买NFT #${tokenId}`);

      const userAddress = await signer.getAddress();
      
      // 获取NFT价格
      const listing = await marketContract.listings(tokenId);
      if (!listing.isListed) {
        throw new Error('该NFT未上架');
      }

      const price = listing.price;
      console.log(`NFT价格: ${ethers.formatEther(price)} ETH`);

      // 检查用户代币余额
      const tokenBalance = await erc20Contract.balanceOf(userAddress);
      if (tokenBalance < price) {
        throw new Error('代币余额不足');
      }

      // 使用 transferWithCallback 购买
      console.log('使用transferWithCallback购买...');
      const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [tokenId]);
      const transferTx = await erc20Contract.transferWithCallback(MARKET_ADDRESS, price, data);
      await transferTx.wait();

      console.log(`NFT #${tokenId} 通过回调方式购买成功`);
      return true;
    } catch (error) {
      console.error('NFT回调购买失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [marketContract, erc20Contract, signer]);

  // 获取ERC20代币余额
  const getTokenBalance = useCallback(async (userAddress) => {
    if (!erc20Contract || !userAddress) {
      throw new Error('合约未初始化或用户地址无效');
    }

    try {
      const balance = await erc20Contract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('获取代币余额失败:', error);
      throw error;
    }
  }, [erc20Contract]);

  // 检查NFT是否已批准给市场合约
  const checkApproval = useCallback(async (tokenId, ownerAddress) => {
    if (!nftContract || !ownerAddress) {
      throw new Error('合约未初始化或用户地址无效');
    }

    try {
      const approvedAddress = await nftContract.getApproved(tokenId);
      return approvedAddress.toLowerCase() === MARKET_ADDRESS.toLowerCase();
    } catch (error) {
      console.error('检查批准状态失败:', error);
      return false;
    }
  }, [nftContract]);

  // 铸造NFT
  const mintNFT = useCallback(async (tokenURI) => {
    if (!nftContract || !signer) {
      throw new Error('合约未初始化或未连接钱包');
    }

    try {
      setLoading(true);
      console.log(`铸造NFT, URI: ${tokenURI}`);

      const userAddress = await signer.getAddress();
      const mintTx = await nftContract.mint(userAddress, tokenURI);
      const receipt = await mintTx.wait();

      // 从交易日志中提取tokenId
      let tokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = nftContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'Transfer' && parsedLog.args.from === '0x0000000000000000000000000000000000000000') {
            tokenId = parsedLog.args.tokenId.toString();
            break;
          }
        } catch (e) {
          // 忽略解析失败的日志
        }
      }

      console.log(`NFT铸造成功, TokenID: ${tokenId}`);
      return tokenId;
    } catch (error) {
      console.error('NFT铸造失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [nftContract, signer]);

  return {
    provider,
    signer,
    nftContract,
    marketContract,
    erc20Contract,
    isInitialized,
    loading,
    getContract,
    getListedNFTs,
    getUserNFTs,
    listNFT,
    cancelListing,
    buyNFT,
    buyNFTWithCallback,
    getTokenBalance,
    checkApproval,
    mintNFT,
    initializeContracts,
    clearCache
  };
};