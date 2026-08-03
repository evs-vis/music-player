import { createApp } from 'vue'
import pinia from '@/stores/index'
import App from './App.vue'
import router from './router'

// Vant 模板组件样式由 VantResolver 按需引入（vite.config.js）；
// 这里只补 JS 函数式组件（showToast/showNotify）的样式入口
import 'vant/es/toast/style'
import 'vant/es/notify/style'
import '@/styles/notify.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
