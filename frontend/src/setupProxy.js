const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only proxy API requests, not static assets
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
    })
  );
};
