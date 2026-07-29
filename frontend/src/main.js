import { createApp } from 'vue'
import pinia from '@/stores/index'
import App from './App.vue'
import router from './router'
// import '@/styles/variables.scss'

// 引入 Vant 全局基础样式
import 'vant/lib/index.css'
const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
