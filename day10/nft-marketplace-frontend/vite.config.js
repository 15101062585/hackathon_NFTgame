// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  // 强制使用其他构建方式
  optimizeDeps: {
    exclude: ['esbuild']
  },
  build: {
    minify: 'terser' // 使用 terser 而不是 esbuild
  }
})