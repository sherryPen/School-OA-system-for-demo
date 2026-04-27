import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api/llm': {
        target: 'https://open.bigmodel.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, '/api/paas/v4'),
        // 开发环境：由 Vite 代理注入 API Key（从环境变量读取，不写入代码）
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const apiKey = process.env.ZHIPU_API_KEY
            if (apiKey) {
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
            }
          })
        }
      }
    }
  }
})
