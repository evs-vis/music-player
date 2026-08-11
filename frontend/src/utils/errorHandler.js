import { showToast } from 'vant'

// 全局错误捕获体系：
//  1. Vue 渲染错误（app.config.errorHandler）
//  2. 全局 JS 错误（window.error）
//  3. 未捕获 Promise 拒绝（unhandledrejection）
//  4. 路由懒加载 chunk 失败（router.onError，自动重拉一次）
//  5. 组件级隔离（ErrorBoundary.vue 的 onErrorCaptured）
// 错误 1s 节流去重，写入 localStorage['app_errors'] 环形队列（50 条），可离线回溯。

const ERROR_STORAGE_KEY = 'app_errors'
const MAX_ERRORS = 50

// 判断是否为路由懒加载 chunk 加载失败
function isChunkLoadError(error) {
  return (
    error?.name === 'ChunkLoadError' || /Loading chunk [\w-]+ failed/i.test(error?.message || '')
  )
}

// chunk 加载失败：单次自动恢复（sessionStorage 标记防死循环），仍失败则提示
function handleChunkError(router, error) {
  const retriedKey = 'chunk_retried'
  const to = error?.to?.fullPath
  if (!sessionStorage.getItem(retriedKey) && to) {
    sessionStorage.setItem(retriedKey, '1')
    router.replace(to) // 强制重新拉 chunk
    return
  }
  sessionStorage.removeItem(retriedKey)
  showToast('页面加载失败，请重试')
  reportError(error, { phase: 'router.chunk' })
}

// 写本地错误队列（环形，去重，节流）
let lastReportTime = 0
let lastErrorKey = ''
function reportError(error, extra = {}) {
  const message = error?.message || String(error)
  const now = Date.now()
  // 1s 节流 + 同内容去重：防快速切歌/连点时的错误风暴
  if (now - lastReportTime < 1000 && message === lastErrorKey) return
  lastReportTime = now
  lastErrorKey = message

  console.error('[app error]', error, extra)
  const entry = {
    time: new Date().toISOString(),
    name: error?.name || 'Error',
    message,
    stack: error?.stack?.slice(0, 500),
    ...extra
  }
  try {
    const list = JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]')
    list.push(entry)
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(list.slice(-MAX_ERRORS)))
  } catch {
    /* localStorage 不可用时静默 */
  }
}

export function setupErrorHandlers(app, router) {
  // Vue 组件渲染错误（会继续冒泡，ErrorBoundary 已拦截的不会再到这里）
  app.config.errorHandler = (err, instance, info) => {
    reportError(err, { phase: 'vue.render', info })
  }

  window.addEventListener('error', (e) => {
    reportError(e.error || e, { phase: 'window.error' })
  })

  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason, { phase: 'unhandledrejection' })
  })

  router.onError((error) => {
    if (isChunkLoadError(error)) {
      handleChunkError(router, error)
    } else {
      reportError(error, { phase: 'router' })
    }
  })
}
