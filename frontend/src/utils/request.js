import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores'
import { showToast } from 'vant'
// 创建 Axios 实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    //请求头携带 token
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (err) => {
    console.error('Request Error:', err)
    return Promise.reject(err)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  //处理响应数据(2xx)
  (response) => response.data,
  //处理响应错误(4xx,5xx)
  (err) => {
    const authStore = useAuthStore()
    if (err.response) {
      const status = err.response?.status
      if (status === 401) {
        authStore.logout()
        router.push('/login')
      } else if (status === 500) {
        showToast('err.message || 数据异常,请稍后重试')
      } else {
        showToast('err.message || 请求失败,请稍后重试')
      }
    } else {
      showToast('网络连接失败,请检查网络')
    }
    return Promise.reject(err)
  }
)

export default instance
