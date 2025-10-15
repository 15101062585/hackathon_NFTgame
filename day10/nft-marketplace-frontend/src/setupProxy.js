// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🚀 代理请求:', req.method, req.url, '->', proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ 代理响应:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('❌ 代理错误:', err.message);
      }
    })
  );
};