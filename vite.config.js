import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // 自动下载 mkcert 并签发本机受信任证书
    // savePath 指定程序/CA/证书全部保存在项目内（D 盘），不写入 C 盘用户目录
    mkcert({
      source: 'coding',
      savePath: fileURLToPath(new URL('./.mkcert', import.meta.url)),
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    https: true,
    port: 5174,
    proxy: {
      // 统一走网关：http://localhost:800
      // 浏览器 → https://localhost:5173（加密）→ Vite 代理 → http 后端
      '/api': {
        target: 'http://localhost:800',
        changeOrigin: true,
      },
    },
  },
})
