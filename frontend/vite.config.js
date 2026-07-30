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
      resolvers: [VantResolver()]
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
  }
})
