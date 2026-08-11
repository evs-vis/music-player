import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores'
import { showToast } from 'vant'

// 创建 Axios 实例
// baseURL 默认留空（走同源 /api，由 vite dev/preview 的 proxy 转发到后端），
// 生产部署时通过 VITE_API_BASE_URL 指向线上后端；硬编码 localhost:3000 会绕过 proxy 触发 CORS。
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000
})

// ====== 重复请求取消（同 key 后者胜） ======
// key = method:url:params 序列化；新请求发起时 abort 在途的同 key 请求，
// 避免快速搜索/重复导航时旧响应覆盖新结果。
const pendingMap = new Map() // key -> AbortController

export function buildRequestKey(method, url, params) {
  return `${method}:${url}:${JSON.stringify(params || {})}`
}

// ====== 请求拦截器 ======
instance.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }

  // 仅对 GET/HEAD 做同 key 取消（写请求不可安全取消）
  const method = (config.method || 'get').toLowerCase()
  if (method === 'get' || method === 'head') {
    const key = buildRequestKey(method, config.url, config.params)
    const prev = pendingMap.get(key)
    if (prev) prev.abort()
    const controller = new AbortController()
    config.signal = controller.signal
    config.__requestKey = key
    pendingMap.set(key, controller)
  }
  return config
})

// ====== 响应拦截器 ======
instance.interceptors.response.use(
  // 处理响应数据(2xx)
  (response) => {
    if (response.config.__requestKey) {
      // 仅当仍是最新请求时才删除，避免新请求误删
      if (pendingMap.get(response.config.__requestKey)?.signal === response.config.signal) {
        pendingMap.delete(response.config.__requestKey)
      }
    }
    return response.data
  },
  (err) => {
    // 取消的请求静默丢弃：不弹 toast、不触发 401 登出（否则快速搜索会误弹"网络连接失败"）
    if (axios.isCancel(err)) {
      err.__cancelled = true
      return Promise.reject(err)
    }

    // 幂等 GET/HEAD 自动重试（指数退避 1s/2s，最多 2 次）：
    // 仅网络层失败（无 response）或 5xx 时重试；4xx/401 不重试（避免重复登录、重复写）
    const method = (err.config?.method || '').toLowerCase()
    const retryCount = err.config?.__retryCount || 0
    if ((method === 'get' || method === 'head') && retryCount < 2) {
      const status = err.response?.status
      const retriable = !err.response || (status >= 500 && status !== 501)
      if (retriable) {
        err.config.__retryCount = retryCount + 1
        err.config.__retrySilent = true // 重试期间失败不弹 toast，最终耗尽时才弹
        const delay = 1000 * 2 ** retryCount
        return new Promise((resolve) => setTimeout(resolve, delay)).then(() => instance(err.config))
      }
    }

    // 只有最终失败（重试已耗尽或非重试类错误）才走统一错误提示
    const authStore = useAuthStore()
    if (err.response) {
      const status = err.response?.status
      // 优先展示后端返回的业务错误信息（如"用户名已存在"），缺失时回退通用文案
      const serverMsg = err.response?.data?.error
      if (status === 401) {
        authStore.logout()
        router.push('/login')
      } else if (status === 500) {
        if (!err.config?.__retrySilent) showToast(serverMsg || '数据异常，请稍后重试')
      } else {
        if (!err.config?.__retrySilent) showToast(serverMsg || '请求失败，请稍后重试')
      }
    } else {
      if (!err.config?.__retrySilent) showToast('网络连接失败，请检查网络')
    }
    return Promise.reject(err)
  }
)

// 取消全部在途 GET（可选，路由切换时按需调用；本实现靠"同 key 后者胜"即可覆盖主要场景）
instance.cancelAllGets = () => {
  pendingMap.forEach((controller) => controller.abort())
  pendingMap.clear()
}

// 取消指定 key 的在途请求
instance.cancelByKey = (key) => {
  const controller = pendingMap.get(key)
  if (controller) {
    controller.abort()
    pendingMap.delete(key)
  }
}

export default instance
