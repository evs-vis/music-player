import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
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
    }),
    visualizer({
      open: true, // 打包完成后自动打开分析报告
      filename: 'stats.html'
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
      '/avatars': 'http://localhost:3000', // 头像静态资源代理
      '/covers': 'http://localhost:3000', // 新增封面图代理
      '/audio': 'http://localhost:3000' // 新增音频文件代理
    }
  },
  // preview 也走同样的代理：让 Lighthouse 能测到真实构建产物 + 真实数据流
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/avatars': 'http://localhost:3000',
      '/covers': 'http://localhost:3000',
      '/audio': 'http://localhost:3000'
    }
  },
  build: {
    rollupOptions: {
      output: {
        // 只对 Vue 生态与 axios 强制独立 chunk，便于浏览器长期缓存；
        // vant 不再手动分组，交给 Rolldown 按依赖自然拆分到使用它的路由 chunk（懒加载才下载）
        // 注意：Rolldown 的 manualChunks 只接受函数形式（不支持 Rollup 的对象形式）；
        // 不能像 Rollup 那样写 return 'vendor' 兜底——兜底会把所有 node_modules 聚成单块、vant 全进首屏
        manualChunks(id) {
          if (id.includes('node_modules')) {
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
