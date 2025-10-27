import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import WalletProvider from '../app/components/WalletProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NFT 合成实验室',
  description: '融合NFT创造全新数字艺术品',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}