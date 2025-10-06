'use client'

import { useState, useEffect } from 'react'
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi'

const TOKEN_BANK_ADDRESS = '0xa6648A516d8e50A9665Fac19D564Ae44E73b9164'
const TOKEN_ADDRESS = '0x5F97a3a99B590D93fF798b7dCE5E917d4eEd8778'

// ERC20 ABI
const erc20ABI = [
  {
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "transferFrom",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

// TokenBank ABI
const tokenBankABI = [
  {
    inputs: [{ name: "_user", type: "address" }],
    name: "balances",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "value", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "value", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

export default function TokenBank() {
  const { address, isConnected } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [approveAmount, setApproveAmount] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>({})

  // 读取用户代币余额
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  // 读取用户存款余额
  const { data: depositBalance, refetch: refetchDepositBalance } = useReadContract({
    address: TOKEN_BANK_ADDRESS,
    abi: tokenBankABI,
    functionName: 'balances',
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  // 读取批准额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address!, TOKEN_BANK_ADDRESS],
    query: {
      enabled: !!address,
    },
  })

  // 读取 TokenBank 合约中的总代币余额
  const { data: tokenBankTokenBalance, refetch: refetchTokenBankTokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [TOKEN_BANK_ADDRESS],
    query: {
      enabled: !!address,
    },
  })

  // 批准交易
  const { 
    data: approveHash,
    writeContract: approve,
    isPending: isApprovePending,
    error: approveError 
  } = useWriteContract()

  // 存款交易
  const { 
    data: depositHash,
    writeContract: deposit,
    isPending: isDepositPending,
    error: depositError 
  } = useWriteContract()

  // 取款交易
  const { 
    data: withdrawHash,
    writeContract: withdraw,
    isPending: isWithdrawPending,
    error: withdrawError 
  } = useWriteContract()

  // 等待批准交易确认
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = 
    useWaitForTransactionReceipt({
      hash: approveHash,
    })

  // 等待存款交易确认
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = 
    useWaitForTransactionReceipt({
      hash: depositHash,
    })

  // 等待取款交易确认
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = 
    useWaitForTransactionReceipt({
      hash: withdrawHash,
    })

  // 收集调试信息
  useEffect(() => {
    setDebugInfo({
      address,
      tokenBalance: tokenBalance?.toString(),
      depositBalance: depositBalance?.toString(),
      allowance: allowance?.toString(),
      tokenBankTokenBalance: tokenBankTokenBalance?.toString(),
      isDepositSuccess,
      isWithdrawSuccess,
      isApproveSuccess
    })
  }, [address, tokenBalance, depositBalance, allowance, tokenBankTokenBalance, isDepositSuccess, isWithdrawSuccess, isApproveSuccess])

  // 交易成功后刷新所有数据
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess || isApproveSuccess) {
      console.log('刷新数据...')
      setTimeout(() => {
        refetchDepositBalance()
        refetchTokenBalance()
        refetchTokenBankTokenBalance()
        refetchAllowance()
      }, 2000) // 等待2秒让区块链状态更新
    }
  }, [isDepositSuccess, isWithdrawSuccess, isApproveSuccess, refetchDepositBalance, refetchTokenBalance, refetchTokenBankTokenBalance, refetchAllowance])

  // 处理批准
  const handleApprove = async () => {
    if (!approveAmount || !address) return

    const amount = BigInt(Number(approveAmount) * 10 ** 18)
    console.log('批准金额:', amount.toString())
    
    approve({
      address: TOKEN_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [TOKEN_BANK_ADDRESS, amount],
    })
  }

  // 处理存款
  const handleDeposit = async () => {
    if (!depositAmount || !address) return

    const amount = BigInt(Number(depositAmount) * 10 ** 18)
    console.log('存款金额:', amount.toString())
    
    // 先检查批准额度
    const currentAllowance = allowance || BigInt(0)
    console.log('当前批准额度:', currentAllowance.toString())
    console.log('需要额度:', amount.toString())

    if (currentAllowance < amount) {
      console.log('批准额度不足，请先批准代币')
      alert(`批准额度不足！当前批准额度: ${(Number(currentAllowance) / 10 ** 18).toLocaleString()}，需要: ${depositAmount}`)
      return
    }

    console.log('执行存款...')
    deposit({
      address: TOKEN_BANK_ADDRESS,
      abi: tokenBankABI,
      functionName: 'deposit',
      args: [amount],
    })
  }

  // 处理取款
  const handleWithdraw = async () => {
    if (!withdrawAmount || !address) return

    const amount = BigInt(Number(withdrawAmount) * 10 ** 18)
    console.log('取款金额:', amount.toString())
    
    withdraw({
      address: TOKEN_BANK_ADDRESS,
      abi: tokenBankABI,
      functionName: 'withdraw',
      args: [amount],
    })
  }

  // 批准无限额度
  const handleApproveInfinite = async () => {
    if (!address) return

    const infiniteAmount = BigInt(2) ** BigInt(256) - BigInt(1) // 最大uint256值
    console.log('批准无限额度:', infiniteAmount.toString())
    
    approve({
      address: TOKEN_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [TOKEN_BANK_ADDRESS, infiniteAmount],
    })
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">请先连接钱包</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 调试信息 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">调试信息</h3>
        <pre className="text-sm text-yellow-700 overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 代币余额卡片 */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">代币余额</h3>
          <p className="text-2xl font-bold text-blue-600">
            {tokenBalance ? (Number(tokenBalance) / 10 ** 18).toLocaleString() : '0'}
          </p>
          <p className="text-sm text-blue-500 mt-1">ERC20 代币</p>
        </div>

        {/* 存款余额卡片 */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-2">存款余额</h3>
          <p className="text-2xl font-bold text-green-600">
            {depositBalance ? (Number(depositBalance) / 10 ** 18).toLocaleString() : '0'}
          </p>
          <p className="text-sm text-green-500 mt-1">在 TokenBank 中</p>
        </div>

        {/* TokenBank 合约代币余额 */}
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">合约总余额</h3>
          <p className="text-2xl font-bold text-purple-600">
            {tokenBankTokenBalance ? (Number(tokenBankTokenBalance) / 10 ** 18).toLocaleString() : '0'}
          </p>
          <p className="text-sm text-purple-500 mt-1">TokenBank 持有的代币</p>
        </div>

        {/* 批准额度 */}
        <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-800 mb-2">批准额度</h3>
          <p className="text-2xl font-bold text-orange-600">
            {allowance ? (Number(allowance) / 10 ** 18).toLocaleString() : '0'}
          </p>
          <p className="text-sm text-orange-500 mt-1">TokenBank 可使用的额度</p>
        </div>
      </div>

      {/* 批准功能 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">批准代币</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                批准金额
              </label>
              <input
                type="number"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="输入批准金额"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApprove}
                disabled={isApprovePending || isApproveConfirming || !approveAmount}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isApprovePending || isApproveConfirming ? '批准中...' : '批准代币'}
              </button>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <button
              onClick={handleApproveInfinite}
              disabled={isApprovePending || isApproveConfirming}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isApprovePending || isApproveConfirming ? '批准中...' : '批准无限额度'}
            </button>
            <p className="text-sm text-gray-500 mt-2 text-center">
              无限额度授权后，后续存款无需再次批准
            </p>
          </div>

          {approveError && (
            <p className="text-red-500 text-sm">批准错误: {approveError.message}</p>
          )}
          {isApproveSuccess && (
            <p className="text-green-500 text-sm">批准成功!</p>
          )}
        </div>
      </div>

      {/* 存款功能 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">存款</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              存款金额
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="输入存款金额"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleDeposit}
            disabled={isDepositPending || isDepositConfirming || !depositAmount}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isDepositPending || isDepositConfirming ? '存款中...' : '存款'}
          </button>
          {depositError && (
            <p className="text-red-500 text-sm">存款错误: {depositError.message}</p>
          )}
          {isDepositSuccess && (
            <p className="text-green-500 text-sm">存款成功!</p>
          )}
        </div>
      </div>

      {/* 取款功能 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">取款</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取款金额
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="输入取款金额"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawPending || isWithdrawConfirming || !withdrawAmount}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isWithdrawPending || isWithdrawConfirming ? '处理中...' : '取款'}
          </button>
          {withdrawError && (
            <p className="text-red-500 text-sm">错误: {withdrawError.message}</p>
          )}
          {isWithdrawSuccess && (
            <p className="text-green-500 text-sm">取款成功!</p>
          )}
        </div>
      </div>
    </div>
  )
}