import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import readline from 'readline'
import fs from 'fs'
import path from 'path'

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// 初始化客户端
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com')
})

const walletFile = path.join(process.cwd(), 'wallet.json')
let currentAccount = null
let walletClient = null

// ERC20 ABI
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  }
]

// 工具函数：提问
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

// 显示菜单
function showMenu() {
  console.log('\n=== 命令行钱包 ===')
  console.log('1. 生成新私钥')
  console.log('2. 导入私钥')
  console.log('3. 查询余额 (ETH)')
  console.log('4. 查询 ERC20 代币余额')
  console.log('5. 发送 ETH 转账')
  console.log('6. 发送 ERC20 转账')
  console.log('7. 显示当前账户')
  console.log('8. 退出')
}

// 保存钱包
function saveWallet(privateKey, address) {
  const walletData = {
    privateKey,
    address,
    createdAt: new Date().toISOString()
  }
  fs.writeFileSync(walletFile, JSON.stringify(walletData, null, 2))
  console.log('💾 钱包信息已保存到 wallet.json')
}

// 加载钱包
function loadWallet() {
  if (fs.existsSync(walletFile)) {
    try {
      const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'))
      currentAccount = privateKeyToAccount(walletData.privateKey)
      walletClient = createWalletClient({
        account: currentAccount,
        chain: sepolia,
        transport: http('https://ethereum-sepolia-rpc.publicnode.com')
      })
      console.log(`✅ 已加载钱包: ${currentAccount.address}`)
      return true
    } catch (error) {
      console.log('❌ 加载钱包文件失败')
    }
  }
  return false
}

// 生成新私钥
async function generateNewPrivateKey() {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  
  saveWallet(privateKey, account.address)
  currentAccount = account
  walletClient = createWalletClient({
    account: currentAccount,
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com')
  })

  console.log(`✅ 新钱包创建成功!`)
  console.log(`📧 地址: ${account.address}`)
  console.log(`🔑 私钥: ${privateKey}`)
  console.log('⚠️  请妥善保存私钥!')
}

// 导入私钥
async function importPrivateKey() {
  const privateKey = await question('请输入私钥: ')
  
  try {
    const account = privateKeyToAccount(privateKey)
    currentAccount = account
    walletClient = createWalletClient({
      account: currentAccount,
      chain: sepolia,
      transport: http('https://ethereum-sepolia-rpc.publicnode.com')
    })

    saveWallet(privateKey, account.address)
    console.log(`✅ 私钥导入成功!`)
    console.log(`📧 地址: ${account.address}`)
  } catch (error) {
    console.log('❌ 私钥格式错误!')
  }
}

// 查询 ETH 余额
async function queryBalance() {
  if (!currentAccount) {
    console.log('❌ 请先创建或导入钱包!')
    return
  }

  try {
    const balance = await publicClient.getBalance({
      address: currentAccount.address
    })
    
    console.log(`💰 余额: ${formatEther(balance)} ETH`)
    console.log(`📧 地址: ${currentAccount.address}`)
  } catch (error) {
    console.log('❌ 查询余额失败:', error.message)
  }
}

// 查询 ERC20 余额
async function queryERC20Balance() {
  if (!currentAccount) {
    console.log('❌ 请先创建或导入钱包!')
    return
  }

  const tokenAddress = await question('请输入 ERC20 代币合约地址: ')
  
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [currentAccount.address]
    })

    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })

    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol'
    })

    const formattedBalance = Number(balance) / Math.pow(10, decimals)
    console.log(`💰 ${symbol} 余额: ${formattedBalance} ${symbol}`)
    
  } catch (error) {
    console.log('❌ 查询代币余额失败:', error.message)
  }
}

// 发送 ETH 转账
async function sendETH() {
  if (!currentAccount) {
    console.log('❌ 请先创建或导入钱包!')
    return
  }

  const toAddress = await question('请输入接收地址: ')
  const amount = await question('请输入转账金额 (ETH): ')

  try {
    console.log('🔄 发送交易中...')
    
    const hash = await walletClient.sendTransaction({
      to: toAddress,
      value: parseEther(amount),
      type: 'eip1559'
    })

    console.log(`✅ 交易已发送!`)
    console.log(`📄 交易哈希: ${hash}`)
    console.log(`🔍 查看详情: https://sepolia.etherscan.io/tx/${hash}`)

    // 等待交易确认
    console.log('⏳ 等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`✅ 交易已确认! 区块: ${receipt.blockNumber}`)

  } catch (error) {
    console.log('❌ 发送交易失败:', error.message)
  }
}

// 发送 ERC20 转账
async function sendERC20() {
  if (!currentAccount) {
    console.log('❌ 请先创建或导入钱包!')
    return
  }

  const tokenAddress = await question('请输入 ERC20 代币合约地址: ')
  const toAddress = await question('请输入接收地址: ')
  const amount = await question('请输入转账金额: ')

  try {
    // 获取代币信息
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    })

    const symbol = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol'
    })

    const value = BigInt(Number(amount) * Math.pow(10, decimals))

    console.log('🔄 构建 ERC20 转账交易...')
    
    const { encodeFunctionData } = await import('viem')
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [toAddress, value]
    })

    // 发送交易
    const hash = await walletClient.sendTransaction({
      to: tokenAddress,
      data: data,
      type: 'eip1559'
    })

    console.log(`✅ ERC20 转账已发送!`)
    console.log(`💰 金额: ${amount} ${symbol}`)
    console.log(`📄 交易哈希: ${hash}`)
    console.log(`🔍 查看详情: https://sepolia.etherscan.io/tx/${hash}`)

    // 等待交易确认
    console.log('⏳ 等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`✅ 交易已确认! 区块: ${receipt.blockNumber}`)

  } catch (error) {
    console.log('❌ ERC20 转账失败:', error.message)
  }
}

// 显示当前账户
function showCurrentAccount() {
  if (!currentAccount) {
    console.log('❌ 没有加载的钱包')
    return
  }

  console.log(`📧 当前账户: ${currentAccount.address}`)
  if (fs.existsSync(walletFile)) {
    const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'))
    console.log(`🕐 创建时间: ${walletData.createdAt}`)
  }
}

// 主函数
async function main() {
  console.log('🚀 命令行钱包启动...')
  console.log('🌐 网络: Sepolia Testnet')

  // 尝试加载已有钱包
  loadWallet()

  while (true) {
    showMenu()
    const choice = await question('\n请选择操作 (1-8): ')

    switch (choice) {
      case '1':
        await generateNewPrivateKey()
        break
      case '2':
        await importPrivateKey()
        break
      case '3':
        await queryBalance()
        break
      case '4':
        await queryERC20Balance()
        break
      case '5':
        await sendETH()
        break
      case '6':
        await sendERC20()
        break
      case '7':
        showCurrentAccount()
        break
      case '8':
        console.log('👋 再见!')
        rl.close()
        return
      default:
        console.log('❌ 无效选择，请重新输入!')
    }
  }
}

// 启动程序
main().catch(console.error)