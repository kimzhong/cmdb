module.exports = {
  devServer: {
    port: 3000,
    // 启用 history 模式 SPA 路由 fallback：直接访问 /resource 等深层路径时
    // 不会返回 404，而是返回 index.html 让 Vue Router 接管路由
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  },
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].charset = 'utf-8'
      return args
    })
  }
}
