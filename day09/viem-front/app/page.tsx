'use client'

import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TokenBank from '@/components/TokenBank'
import ConnectWallet from '@/components/ConnectWallet'

const queryClient = new QueryClient()

export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                TokenBank DApp
              </h1>
              <p className="text-lg text-gray-600">
                管理您的代币存款和取款
              </p>
            </header>
            
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              <ConnectWallet />
              <TokenBank />
            </div>
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}