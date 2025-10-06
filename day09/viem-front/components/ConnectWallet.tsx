'use client'

import { useConnect, useDisconnect, useAccount } from 'wagmi'

export default function ConnectWallet() {
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAccount()

  const connector = connectors[0]

  if (!isConnected) {
    return (
      <div className="text-center">
        <button
          onClick={() => connect({ connector })}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          连接钱包
        </button>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <div>
        <p className="text-sm text-gray-600">已连接钱包</p>
        <p className="font-mono text-lg break-all bg-gray-50 p-3 rounded mt-2">
          {address}
        </p>
      </div>
      <button
        onClick={() => disconnect()}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        断开连接
      </button>
    </div>
  )
}