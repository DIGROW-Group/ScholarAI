const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      changeOrigin: true,
      // Increase timeout for large file uploads
      timeout: 300000, // 5 minutes
      // http-proxy-middleware streams multipart/form-data automatically
      // No body parsing needed for file uploads
    })
  );
};

