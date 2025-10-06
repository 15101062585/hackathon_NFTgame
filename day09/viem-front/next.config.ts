// 如果遇到找不到模块“next”或其类型声明的问题，可能需要安装 next 依赖
// 请先运行 `npm install next` 或 `yarn add next` 安装依赖
import type { NextConfig } from "next";

// next.config.js

const nextConfig = {
  productionBrowserSourceMaps: false,
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.devtool = false;
    }
    return config;
  }
};
export default nextConfig;
