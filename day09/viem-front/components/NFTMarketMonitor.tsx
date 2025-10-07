import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { mainnet, sepolia } from 'viem/chains'

// NFTMarket 合约 ABI
const nftMarketAbi = parseAbi([
  'event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp)',
  'event NFTBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp)',
  'event NFTCancelled(uint256 indexed tokenId, address indexed seller, uint256 timestamp)',
  'function listings(uint256) view returns (address seller, uint256 price, bool isListed)'
])

// 配置
const config = {
  // 替换为你的 NFTMarket 合约地址
  NFT_MARKET_ADDRESS: '0x...' as `0x${string}`,
  // 选择网络
  chain: sepolia, // 或 mainnet, 或其他测试网
  // RPC URL
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-api-key'
}

// 创建客户端
const publicClient = createPublicClient({
  chain: config.chain,
  transport: http(config.rpcUrl)
})

class NFTMarketListener {
  private contractAddress: `0x${string}`
  
  constructor(contractAddress: `0x${string}`) {
    this.contractAddress = contractAddress
  }

  // 监听所有事件
  async startListening() {
    console.log('开始监听 NFTMarket 事件...')
    
    // 监听上架事件
    this.watchListEvents()
    
    // 监听购买事件  
    this.watchBuyEvents()
    
    // 监听取消事件
    this.watchCancelEvents()
  }

  // 监听上架事件
  private async watchListEvents() {
    const unwatch = publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: nftMarketAbi,
      eventName: 'NFTListed',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { tokenId, seller, price, timestamp } = log.args
          console.log('🎯 NFT 上架事件:')
          console.log(`   Token ID: ${tokenId}`)
          console.log(`   卖家: ${seller}`)
          console.log(`   价格: ${price} 代币`)
          console.log(`   时间: ${new Date(Number(timestamp) * 1000).toLocaleString()}`)
          console.log(`   交易哈希: ${log.transactionHash}`)
          console.log('---')
          
          // 这里可以添加数据库存储、通知等逻辑
          if (tokenId && seller && price && timestamp) {
            this.handleListing(tokenId, seller, price, timestamp)
          }
        })
      },
    })

    return unwatch
  }

  // 监听购买事件
  private async watchBuyEvents() {
    const unwatch = publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: nftMarketAbi,
      eventName: 'NFTBought',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { tokenId, buyer, seller, price, timestamp } = log.args
          console.log('💰 NFT 购买事件:')
          console.log(`   Token ID: ${tokenId}`)
          console.log(`   买家: ${buyer}`)
          console.log(`   卖家: ${seller}`)
          console.log(`   价格: ${price} 代币`)
          console.log(`   时间: ${new Date(Number(timestamp) * 1000).toLocaleString()}`)
          console.log(`   交易哈希: ${log.transactionHash}`)
          console.log('---')
          
          // 这里可以添加数据库存储、通知等逻辑
          if (tokenId && buyer && seller && price && timestamp) {
            this.handlePurchase(tokenId, buyer, seller, price, timestamp)
          }
        })
      },
    })

    return unwatch
  }

  // 监听取消事件
  private async watchCancelEvents() {
    const unwatch = publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: nftMarketAbi,
      eventName: 'NFTCancelled',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { tokenId, seller, timestamp } = log.args
          console.log('❌ NFT 取消上架事件:')
          console.log(`   Token ID: ${tokenId}`)
          console.log(`   卖家: ${seller}`)
          console.log(`   时间: ${new Date(Number(timestamp) * 1000).toLocaleString()}`)
          console.log(`   交易哈希: ${log.transactionHash}`)
          console.log('---')
          
          // 这里可以添加数据库存储、通知等逻辑
          if (tokenId && seller && timestamp) {
            this.handleCancellation(tokenId, seller, timestamp)
          }
        })
      },
    })

    return unwatch
  }

  // 处理上架事件的业务逻辑
  private async handleListing(
    tokenId: bigint, 
    seller: string, 
    price: bigint, 
    timestamp: bigint
  ) {
    // 这里可以实现你的业务逻辑，比如：
    // - 存储到数据库
    // - 发送通知
    // - 更新缓存
    // - 触发其他业务逻辑
    
    try {
      // 示例：获取上架详情
      const listing = await publicClient.readContract({
        address: this.contractAddress,
        abi: nftMarketAbi,
        functionName: 'listings',
        args: [tokenId]
      })
      
      console.log(`📊 上架详情:`, listing)
      
      // 发送通知示例
      await this.sendNotification({
        type: 'LISTING',
        tokenId: Number(tokenId),
        seller,
        price: Number(price),
        timestamp: Number(timestamp)
      })
      
    } catch (error) {
      console.error('处理上架事件时出错:', error)
    }
  }

  // 处理购买事件的业务逻辑
  private async handlePurchase(
    tokenId: bigint,
    buyer: string,
    seller: string, 
    price: bigint,
    timestamp: bigint
  ) {
    try {
      // 业务逻辑实现
      console.log(`处理购买: Token ${tokenId} 从 ${seller} 卖给 ${buyer}`)
      
      await this.sendNotification({
        type: 'PURCHASE',
        tokenId: Number(tokenId),
        buyer,
        seller,
        price: Number(price),
        timestamp: Number(timestamp)
      })
      
    } catch (error) {
      console.error('处理购买事件时出错:', error)
    }
  }

  // 处理取消事件的业务逻辑
  private async handleCancellation(
    tokenId: bigint,
    seller: string,
    timestamp: bigint
  ) {
    try {
      // 业务逻辑实现
      console.log(`处理取消: Token ${tokenId} 被 ${seller} 取消上架`)
      
      await this.sendNotification({
        type: 'CANCELLATION',
        tokenId: Number(tokenId),
        seller,
        timestamp: Number(timestamp)
      })
      
    } catch (error) {
      console.error('处理取消事件时出错:', error)
    }
  }

  // 发送通知的示例方法
  private async sendNotification(data: any) {
    // 这里可以实现发送邮件、短信、Webhook 等通知
    // 例如发送到 Discord、Telegram 或你的后端 API
    console.log('发送通知:', data)
    
    // 示例：发送到 Webhook
    /*
    await fetch('https://your-webhook-url.com/nft-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    */
  }

  // 获取历史事件
  async getPastEvents(fromBlock?: bigint) {
    const currentBlock = await publicClient.getBlockNumber()
    const startBlock = fromBlock || currentBlock - BigInt(1000) // 默认查询最近1000个区块
    
    try {
      const listEvents = await publicClient.getContractEvents({
        address: this.contractAddress,
        abi: nftMarketAbi,
        eventName: 'NFTListed',
        fromBlock: startBlock,
      })
      
      const buyEvents = await publicClient.getContractEvents({
        address: this.contractAddress,
        abi: nftMarketAbi,
        eventName: 'NFTBought',
        fromBlock: startBlock,
      })
      
      const cancelEvents = await publicClient.getContractEvents({
        address: this.contractAddress,
        abi: nftMarketAbi,
        eventName: 'NFTCancelled',
        fromBlock: startBlock,
      })
      
      console.log(`📜 历史事件 (区块 ${startBlock} - ${currentBlock}):`)
      console.log(`   上架事件: ${listEvents.length} 个`)
      console.log(`   购买事件: ${buyEvents.length} 个`) 
      console.log(`   取消事件: ${cancelEvents.length} 个`)
      
      return { listEvents, buyEvents, cancelEvents }
      
    } catch (error) {
      console.error('获取历史事件时出错:', error)
      return { listEvents: [], buyEvents: [], cancelEvents: [] }
    }
  }
}

// 使用示例
async function main() {
  const listener = new NFTMarketListener(config.NFT_MARKET_ADDRESS)
  
  // 开始监听新事件
  await listener.startListening()
  
  // 获取历史事件
  await listener.getPastEvents()
  
  // 优雅关闭处理
  process.on('SIGINT', async () => {
    console.log('停止监听...')
    process.exit(0)
  })
}

// 启动监听
main().catch(console.error)