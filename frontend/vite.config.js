import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    Components({
      // importStyle: true（默认）—— 模板中 <van-*> 组件自动引入对应样式，
      // 实现按需引入，避免全量 CSS 被打包
      resolvers: [VantResolver({ importStyle: true })]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 自动在每个 <style lang="scss"> 中注入变量文件
        additionalData: `@use "@/styles/variables.scss" as *;`
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/covers': 'http://localhost:3000', // 新增封面图代理
      '/audio': 'http://localhost:3000' // 新增音频文件代理
    }
  },
  // preview 也走同样的代理：让 Lighthouse 能测到真实构建产物 + 真实数据流
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/covers': 'http://localhost:3000',
      '/audio': 'http://localhost:3000'
    }
  },
  build: {
    rollupOptions: {
      output: {
        // 拆出独立 vendor chunk：Vue 生态与 Vant 单独成包，便于浏览器缓存与首屏并行加载
        // 注意：Rolldown 的 manualChunks 只接受函数形式（不支持 Rollup 的对象形式）
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vant')) return 'vant'
            if (
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('@vue') ||
              id.includes('/vue/')
            ) {
              return 'vue-vendor'
            }
            if (id.includes('axios')) return 'axios'
          }
        }
      }
    }
  }
})
