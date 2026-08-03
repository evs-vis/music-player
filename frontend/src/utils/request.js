import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores'

// 创建 Axios 实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      router.push('/login')
    }

    // showNotify({
    //   type: 'danger',
    //   message:
    //     error.response?.data?.message ||
    //     error.response?.data?.error ||
    //     '请求失败，请重试'
    // })
    return Promise.reject(error)
  }
)

export default instance
