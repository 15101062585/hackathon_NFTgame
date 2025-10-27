'use client'

import { useState, useEffect } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function WalletConnectButton() {
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false)

  useEffect(() => {
    // 检查 Phantom 钱包是否可用
    const checkPhantom = () => {
      const phantom = (window as any).solana
      setIsPhantomAvailable(!!phantom?.isPhantom)
    }

    checkPhantom()
    
    // 监听钱包安装事件
    window.addEventListener('load', checkPhantom)
    return () => window.removeEventListener('load', checkPhantom)
  }, [])

  if (!isPhantomAvailable) {
    return (
      <button
        onClick={() => window.open('https://phantom.app/', '_blank')}
        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        📲 安装 Phantom
      </button>
    )
  }

  return (
    <div className="wallet-connect-container">
      <WalletMultiButton />
      <style jsx>{`
        .wallet-connect-container :global(button) {
          background: linear-gradient(135deg, #8B5CF6, #3B82F6) !important;
          border: none !important;
          border-radius: 9999px !important;
          padding: 12px 24px !important;
          font-weight: 600 !important;
          color: white !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }
        .wallet-connect-container :global(button:hover) {
          transform: scale(1.05) !important;
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3) !important;
        }
      `}</style>
    </div>
  )
}