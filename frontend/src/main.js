import { createApp } from 'vue'
import pinia from '@/stores/index'
import App from './App.vue'
import router from './router'
import { setupErrorHandlers } from '@/utils/errorHandler'
import '@/utils/perf'

// Vant 模板组件样式由 VantResolver 按需引入（vite.config.js）；
// 这里只补 JS 函数式组件（showToast/showNotify）的样式入口
import 'vant/es/toast/style'
import 'vant/es/notify/style'
import '@/styles/notify.css'
import '@/styles/global.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

// 全局错误捕获：Vue 渲染/全局 error/unhandledrejection/路由 chunk 兜底
setupErrorHandlers(app, router)

// 首屏路由就绪（含懒加载页面 chunk 预加载）后再挂载：
// 挂载前 index.html 内联骨架持续可见，挂载瞬间路由一次渲染到位，
// 避免"骨架标题 → 真实标题"或"骨架 → 空白 → 内容"的闪烁
router.isReady().then(() => {
  app.mount('#app')
})
