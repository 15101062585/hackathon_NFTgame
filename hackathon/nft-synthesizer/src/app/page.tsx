'use client'

import { useState, useEffect, useMemo } from 'react'
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'
import Image from "next/image"
import Link from 'next/link'

interface Wallet {
  publicKey: PublicKey | null
  signTransaction?: any
  signAllTransactions?: any
}

interface NFT {
  mint: string
  name: string
  image: string
  description: string
  address: PublicKey
}

// 扩展 Window 接口以包含 solana
declare global {
  interface Window {
    solana?: any
  }
}

export default function Home() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [nfts, setNfts] = useState<NFT[]>([])
  const [selectedNFTs, setSelectedNFTs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [synthesisResult, setSynthesisResult] = useState<string>('')
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false)

  // 初始化连接和 Metaplex
  const connection = useMemo(() => new Connection(clusterApiUrl('devnet')), [])
  const metaplex = useMemo(() => Metaplex.make(connection), [connection])

  // 检查 Phantom 钱包
  useEffect(() => {
    const checkPhantomWallet = () => {
      if (typeof window !== 'undefined' && window.solana && window.solana.isPhantom) {
        const phantomWallet = window.solana
        
        // 监听连接事件
        const handleConnect = (publicKey: PublicKey) => {
          setWallet({
            publicKey,
            signTransaction: phantomWallet.signTransaction,
            signAllTransactions: phantomWallet.signAllTransactions
          })
        }

        // 监听断开连接事件
        const handleDisconnect = () => {
          setWallet(null)
          setBalance(0)
          setNfts([])
          setSelectedNFTs([])
        }

        phantomWallet.on('connect', handleConnect)
        phantomWallet.on('disconnect', handleDisconnect)

        // 检查是否已经连接
        if (phantomWallet.isConnected && phantomWallet.publicKey) {
          handleConnect(new PublicKey(phantomWallet.publicKey))
        }

        // 清理函数
        return () => {
          phantomWallet.off('connect', handleConnect)
          phantomWallet.off('disconnect', handleDisconnect)
        }
      }
    }

    checkPhantomWallet()
  }, [])

  // 获取余额和 NFT
  useEffect(() => {
    if (wallet?.publicKey) {
      fetchWalletData()
    }
  }, [wallet])

  const fetchWalletData = async () => {
    if (!wallet?.publicKey) return

    setIsLoading(true)
    setIsLoadingNFTs(true)
    try {
      // 获取余额
      const balance = await connection.getBalance(wallet.publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)

      // 获取真实的 NFT
      await fetchRealNFTs()
    } catch (error) {
      console.error('获取钱包数据失败:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingNFTs(false)
    }
  }

  const fetchRealNFTs = async () => {
    if (!wallet?.publicKey) return

    try {
      // 使用 Metaplex 获取用户 NFT
      const nftList = await metaplex.nfts().findAllByOwner({
        owner: wallet.publicKey
      })

      console.log('获取到的NFT列表:', nftList)

      const processedNFTs: NFT[] = []

      for (const nft of nftList) {
        try {
          // 获取 NFT 的完整元数据
          const fullNft = await metaplex.nfts().findByMint({ mintAddress: nft.mintAddress })

          if (fullNft.json && fullNft.json.image) {
            processedNFTs.push({
              mint: nft.mintAddress.toString(),
              name: fullNft.json.name || 'Unnamed NFT',
              image: fullNft.json.image,
              description: fullNft.json.description || 'No description',
              address: nft.mintAddress
            })
          }
        } catch (error) {
          console.error('处理NFT元数据失败:', error)
        }
      }

      setNfts(processedNFTs)

      // 如果没有找到NFT，显示一些测试NFT
      if (processedNFTs.length === 0) {
        console.log('未找到NFT，显示测试数据')
        const mockNFTs = [
          {
            mint: 'mock1',
            name: '🔥 火焰之魂',
            image: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=400&h=400&fit=crop',
            description: '蕴含火焰力量的NFT',
            address: new PublicKey('11111111111111111111111111111111')
          },
          {
            mint: 'mock2',
            name: '🌊 海洋之心',
            image: 'https://images.unsplash.com/photo-1530533718754-001d2668365a?w=400&h=400&fit=crop',
            description: '纯净的海洋能量',
            address: new PublicKey('11111111111111111111111111111112')
          },
          {
            mint: 'mock3',
            name: '🌍 大地守护',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
            description: '坚固的大地守护者',
            address: new PublicKey('11111111111111111111111111111113')
          }
        ]
        setNfts(mockNFTs)
      }

    } catch (error) {
      console.error('获取NFT失败:', error)
      // 出错时也显示测试数据
      const mockNFTs = [
        {
          mint: 'mock1',
          name: '🔥 火焰之魂',
          image: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=400&h=400&fit=crop',
          description: '蕴含火焰力量的NFT',
          address: new PublicKey('11111111111111111111111111111111')
        }
      ]
      setNfts(mockNFTs)
    }
  }

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.solana) {
      try {
        await window.solana.connect()
      } catch (error) {
        console.error('连接钱包失败:', error)
        alert('连接钱包失败，请确保已安装 Phantom 钱包')
      }
    } else {
      alert('请安装 Phantom 钱包!')
      window.open('https://phantom.app/', '_blank')
    }
  }

  const disconnectWallet = async () => {
    if (typeof window !== 'undefined' && window.solana) {
      await window.solana.disconnect()
    }
  }

  const toggleNFTSelection = (mint: string) => {
    setSelectedNFTs(prev =>
      prev.includes(mint)
        ? prev.filter(m => m !== mint)
        : [...prev, mint]
    )
  }

  const synthesizeNFTs = async () => {
    if (selectedNFTs.length < 2) {
      alert('请至少选择2个NFT进行合成')
      return
    }

    setIsLoading(true)
    setSynthesisResult('')

    try {
      // 模拟合成过程
      await new Promise(resolve => setTimeout(resolve, 3000))

      const newNFTName = `合成NFT #${Date.now()}`
      setSynthesisResult(`🎉 合成成功！创建了新NFT: ${newNFTName}`)

      // 清空选择
      setSelectedNFTs([])

      // 刷新NFT列表
      const remainingNFTs = nfts.filter(nft => !selectedNFTs.includes(nft.mint))
      const newNFT = {
        mint: `synthetic-${Date.now()}`,
        name: newNFTName,
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop',
        description: `由 ${selectedNFTs.length} 个NFT合成的强大物品`,
        address: new PublicKey('synthetic' + Date.now())
      }
      setNfts([...remainingNFTs, newNFT])

    } catch (error) {
      console.error('合成失败:', error)
      setSynthesisResult('❌ 合成失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 获取选中的NFT名称
  const getSelectedNFTNames = () => {
    return selectedNFTs.map(mint => {
      const nft = nfts.find(n => n.mint === mint)
      return nft ? nft.name : 'Unknown NFT'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 font-sans">
      <main className="container mx-auto min-h-screen px-4 py-8">
        {/* 头部 */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-12">
          <div className="text-center lg:text-left mb-6 lg:mb-0">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🎨</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                NFT 合成实验室
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 max-w-md">
              融合多个NFT，创造出独一无二的数字艺术品
            </p>
          </div>

          {/* 钱包连接状态 */}
          <div className="flex items-center gap-4">
            {wallet ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-center sm:text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    余额: <span className="text-green-600">{balance.toFixed(4)} SOL</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {wallet.publicKey?.toString().slice(0, 8)}...{wallet.publicKey?.toString().slice(-8)}
                  </div>
                </div>
                <Link
                  href="/mint-page"
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  🎨 铸造新 NFT
                </Link>
                <button
                  onClick={disconnectWallet}
                  className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full font-medium hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
                >
                  断开连接
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                🔗 连接钱包
              </button>
            )}
          </div>
        </div>

        {/* 主要内容 */}
        <div className="max-w-7xl mx-auto">
          {/* 功能说明卡片 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20 shadow-xl">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                创造属于你的传奇
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                选择2个或更多NFT，将它们融合成一个全新的、更强大的数字艺术品。
                每一次合成都是独一无二的创造过程！
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">选择NFT</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">从你的收藏中选择2个或多个NFT</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">开始合成</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">一键融合，创造全新艺术品</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">获得新NFT</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">全新的NFT将出现在你的钱包中</p>
                </div>
              </div>
            </div>
          </div>

          {/* NFT 选择区域 */}
          {wallet && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    🎴 我的 NFT 收藏
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {nfts.length} 个NFT待你发掘
                  </p>
                </div>
                <button
                  onClick={fetchWalletData}
                  disabled={isLoading}
                  className="mt-4 sm:mt-0 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 transform hover:scale-105"
                >
                  {isLoading ? '🔄 刷新中...' : '🔄 刷新列表'}
                </button>
              </div>

              {isLoadingNFTs ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">正在加载你的NFT收藏...</p>
                </div>
              ) : nfts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                    {nfts.map((nft) => (
                      <div
                        key={nft.mint}
                        className={`group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-4 cursor-pointer transition-all duration-300 border-2 ${selectedNFTs.includes(nft.mint)
                            ? 'border-purple-500 shadow-2xl scale-105 ring-4 ring-purple-200 dark:ring-purple-800'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-xl'
                          }`}
                        onClick={() => toggleNFTSelection(nft.mint)}
                      >
                        {/* 选择指示器 */}
                        {selectedNFTs.includes(nft.mint) && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center z-10 shadow-lg">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}

                        <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden">
                          <Image
                            src={nft.image}
                            alt={nft.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            onError={(e) => {
                              // 图片加载失败时使用备用图片
                              const target = e.target as HTMLImageElement
                              target.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                          {nft.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {nft.description}
                        </p>

                        <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full inline-block">
                          {nft.mint.slice(0, 6)}...{nft.mint.slice(-4)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 选中的NFT预览 */}
                  {selectedNFTs.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        已选择的NFT ({selectedNFTs.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {getSelectedNFTNames().map((name, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 合成操作区域 */}
                  {selectedNFTs.length >= 2 && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800 backdrop-blur-sm">
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">⚡</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          准备创造奇迹
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-1">
                          即将融合 <span className="font-bold text-purple-600 dark:text-purple-400">{selectedNFTs.length}</span> 个NFT
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          合成后选中的NFT将被销毁，创造出一个全新的传奇物品
                        </p>
                      </div>

                      <button
                        onClick={synthesizeNFTs}
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>创造中...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <span>✨</span>
                            <span>开始合成</span>
                            <span>✨</span>
                          </div>
                        )}
                      </button>
                    </div>
                  )}

                  {/* 合成结果 */}
                  {synthesisResult && (
                    <div className={`mt-6 p-6 rounded-2xl text-center backdrop-blur-sm border ${synthesisResult.includes('成功')
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                      }`}>
                      <div className="text-2xl mb-2">
                        {synthesisResult.includes('成功') ? '🎉' : '❌'}
                      </div>
                      {synthesisResult}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎴</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    暂无 NFT
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    看起来你的钱包里还没有NFT。获取一些NFT来开始你的合成之旅吧！
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                      href="https://magiceden.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                    >
                      购买 NFT
                    </a>
                    <a
                      href="https://solfaucet.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      获取测试 SOL
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 未连接钱包时的提示 */}
          {!wallet && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20 shadow-xl">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🔐</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  连接钱包开始创造
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  连接你的 Phantom 钱包来查看 NFT 收藏并开始合成之旅。
                  每一次融合都是全新的创造体验！
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={connectWallet}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
                  >
                    🔗 连接 Phantom 钱包
                  </button>
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    📲 下载 Phantom
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <footer className="mt-16 text-center">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Built with ❤️ using Next.js + Solana</span>
            </div>
            <div className="flex gap-6">
              <a
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                Solana
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}