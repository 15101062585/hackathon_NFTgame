import { createPublicClient, http, keccak256, toHex, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import dotenv from 'dotenv'

dotenv.config()

// 备用的 RPC 端点列表
const RPC_ENDPOINTS = [
  'https://eth-sepolia.g.alchemy.com/v2/demo',
  'https://1rpc.io/sepolia', 
  'https://sepolia.drpc.org',
  'https://rpc.sepolia.org'
]

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address

if (!CONTRACT_ADDRESS) {
  console.error('❌ CONTRACT_ADDRESS is required in .env file')
  process.exit(1)
}

// 创建客户端（自动重试机制）
async function createClientWithRetry() {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`🔄 Trying RPC: ${endpoint.substring(0, 30)}...`)
      
      const client = createPublicClient({
        chain: sepolia,
        transport: http(endpoint, {
          timeout: 10000, // 10秒超时
          retryCount: 2
        })
      })
      
      // 测试连接
      const blockNumber = await client.getBlockNumber()
      console.log(`✅ Connected! Current block: ${blockNumber}`)
      console.log(`🌐 Using RPC: ${endpoint}`)
      
      return client
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`)
      continue
    }
  }
  
  throw new Error('All RPC endpoints failed')
}

async function main() {
  console.log('🚀 Starting storage reading...')
  console.log(`📄 Contract: ${CONTRACT_ADDRESS}`)
  
  try {
    const client = await createClientWithRetry()
    
    console.log('🔍 Checking contract code...')
    const code = await client.getCode({ address: CONTRACT_ADDRESS })
    console.log('📦 Contract code length:', code?.length || 0)
    
    if (!code || code === '0x') {
      console.log('❌ Contract does not exist at this address')
      return
    }

    // 读取数组长度
    console.log('📖 Reading array length from slot 0...')
    const lengthHex = await client.getStorageAt({
      address: CONTRACT_ADDRESS,
      slot: '0x0000000000000000000000000000000000000000000000000000000000000000'
    })
    
    console.log('📦 Raw length data:', lengthHex)
    
    if (!lengthHex || lengthHex === '0x') {
      console.log('❌ No array length found')
      return
    }
    
    const length = BigInt(lengthHex)
    console.log(`📊 Array length: ${length}`)
    
    if (length === 0n) {
      console.log('ℹ️ Array is empty')
      return
    }

    // 计算数组起始位置
    const arrayStartSlot = keccak256(toHex(0, { size: 32 }))
    console.log(`📍 Array storage starts at: ${arrayStartSlot}`)

    // 读取元素
    console.log('📚 Reading lock elements...')
    for (let i = 0; i < Math.min(Number(length), 3); i++) {
      await readLockInfo(client, i, BigInt(arrayStartSlot))
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
  
  console.log('🎉 Storage reading completed!')
}

async function readLockInfo(client: any, index: number, arrayStartSlot: bigint): Promise<void> {
  try {
    const baseSlot = arrayStartSlot + BigInt(index) * 3n
    const slot1 = toHex(baseSlot, { size: 32 })
    const slot2 = toHex(baseSlot + 1n, { size: 32 })
    
    console.log(`\n🔍 Reading lock[${index}]...`)
    
    const [slot1Data, slot2Data] = await Promise.all([
      client.getStorageAt({ address: CONTRACT_ADDRESS, slot: slot1 }),
      client.getStorageAt({ address: CONTRACT_ADDRESS, slot: slot2 })
    ])
    
    console.log(`   Slot 1: ${slot1Data}`)
    console.log(`   Slot 2: ${slot2Data}`)
    
    if (slot1Data && slot1Data !== '0x' && slot2Data && slot2Data !== '0x') {
      const slot1Value = BigInt(slot1Data)
      const user = `0x${(slot1Value & ((1n << 160n) - 1n)).toString(16).padStart(40, '0')}`
      const startTime = slot1Value >> 160n
      const amount = BigInt(slot2Data)
      
      console.log(`✅ locks[${index}]: user:${user}, startTime:${startTime}, amount:${amount}`)
    } else {
      console.log(`⚠️  lock[${index}]: No data`)
    }
    
  } catch (error: any) {
    console.error(`❌ Error reading lock[${index}]:`, error.message)
  }
}

main().catch(console.error)