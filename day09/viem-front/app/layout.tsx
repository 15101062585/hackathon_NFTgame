import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 由于找不到模块 "./providers"，请确认该文件是否存在。
// 以下几种常见修正方式可尝试：
// 1. 检查文件路径是否正确
// 2. 检查文件扩展名是否匹配（如 .ts, .tsx, .js, .jsx）
// 3. 确保文件已创建

// 假设文件为 TypeScript React 文件，尝试添加 .tsx 扩展名
// 尝试不指定扩展名，让模块解析器自动查找文件
import { Providers } from "./providers.tsx";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simple Viem & Wagmi Demo",
  description: "A simple demo of Viem and Wagmi integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
