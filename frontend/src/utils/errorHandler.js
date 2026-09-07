import { showToast } from 'vant'
import { track, flush } from './telemetry'

// 全局错误捕获体系：
//  1. Vue 渲染错误（app.config.errorHandler）
//  2. 全局 JS 错误（window.error）
//  3. 未捕获 Promise 拒绝（unhandledrejection）
//  4. 路由懒加载 chunk 失败（router.onError 拿回调 to → 自动整页 reload 恢复一次）
//  5. 组件级隔离（ErrorBoundary.vue 的 onErrorCaptured）
// 错误 1s 节流去重，写入 localStorage['app_errors'] 环形队列（50 条），可离线回溯。
//
// 计数（telemetry.track，聚合采集，见 utils/telemetry.js）：
//  - 捕获次数 = 各层 handler「入口」原始事件数，在 setupErrorHandlers 内各自 track；
//    去重/节流只影响本地存储，不影响计数，保证数字反映真实触达层 handler 的次数。
//  - chunk 自愈成败在 handleChunkError 状态机内计（tried/success/fail）。

const ERROR_STORAGE_KEY = 'app_errors'
const MAX_ERRORS = 50

// chunk 加载失败判定。本项目 Vite 构建（dev 与 preview 同源）懒加载失败落到浏览器原生
// TypeError "Failed to fetch dynamically imported module"（CSS 预加载失败为 "Unable to preload CSS"）；
// 旧正则只匹配 webpack 的 ChunkLoadError/rollup 文本，Vite 下永远 false，这里一并兼容。
function isChunkLoadError(error) {
  const msg = error?.message || ''
  return (
    error?.name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module|Unable to preload CSS/i.test(msg)
  )
}

// chunk 自动恢复：
//  关键约束（实验实测）：浏览器 module map 会按 URL 记住「失败的动态 import」——同一文档内对
//  同一 URL 再发 import 不会重新发起网络请求、直接复用失败（dev 与 preview 均如此）。
//  而生产环境 chunk 失败的主因恰是「部署后 index.html 仍引用旧 hash chunk → 404」，
//  重拉同一 URL 必然无效。因此 chunk 失败不靠 router.replace 原地重拉，而是整页 reload 到
//  目标路由一次：新文档重新拉 index.html（引用新 chunk）→ 命中 → 页面正常进入。
//  防死循环：同一路由同一会话只自动 reload 一次；reload 后仍失败则停止、提示并入库。
//  恢复结果跨文档计数（sessionStorage 标记 + main.js settle）：
//    tried   = 首次失败、决定 reload 时计
//    success = reload 后的新文档成功到达目标路由（main.js 挂载后 settleChunkRecovery 判定）
//    fail    = reload 后仍失败（onError 再次触发且标记在有效期内）
const CHUNK_RECOVER_PREFIX = 'chunk_recover:'
const RECOVER_WINDOW = 30000 // 标记有效期：超过视为陈旧（如被重定向兜走），允许再次自动恢复

function chunkRecoverKey(fullPath) {
  return `${CHUNK_RECOVER_PREFIX}${fullPath}`
}

// reload 后仍失败或标记陈旧时的兜底：提示 + 入库
function reportChunkFail(error) {
  showToast('页面加载失败，请刷新重试')
  reportError(error, { phase: 'router.chunk' })
}

// 挂载后调用：本次启动若是 chunk 自动恢复 reload 而来且成功到达目标路由 → 计 recover.chunk.success
export function settleChunkRecovery(router) {
  try {
    const fullPath = router.currentRoute.value.fullPath
    const marker = sessionStorage.getItem(chunkRecoverKey(fullPath))
    if (marker && Date.now() - Number(marker) < RECOVER_WINDOW) {
      sessionStorage.removeItem(chunkRecoverKey(fullPath))
      track('recover.chunk.success')
    }
  } catch {
    /* sessionStorage 不可用时静默 */
  }
}

// 触发一次 chunk 自动恢复（首次失败）；返回 true 表示已接管（调用方无需再 report）
function triggerChunkRecovery(fullPath, error) {
  if (!fullPath) return false
  try {
    const key = chunkRecoverKey(fullPath)
    const marker = sessionStorage.getItem(key)
    if (marker) {
      // 已有标记：若在有效期内说明是 reload 后再次失败 → fail；
      // 若已过期（如被重定向兜走、长期未命中）→ 清掉当作新的首次失败处理
      if (Date.now() - Number(marker) < RECOVER_WINDOW) {
        sessionStorage.removeItem(key)
        track('recover.chunk.fail')
        reportChunkFail(error)
        return true
      }
      sessionStorage.removeItem(key)
    }
    sessionStorage.setItem(key, String(Date.now()))
    track('recover.chunk.tried')
    showToast('页面加载失败，正在重新加载…')
    // 先 flush 本地计数（含本次 tried）再 reload：若不留拍直接整页刷新，
    // pagehide 的 best-effort flush 可能与新文档的 batchNo 冲突导致 success 被服务端幂等跳过。
    // 等 flush 落定（成功则本地已推进 batchNo）后再跳转，新文档计数从下一批开始，绝不丢。
    setTimeout(() => {
      flush().finally(() => window.location.assign(fullPath))
    }, 300)
    return true
  } catch {
    // sessionStorage 不可用：退化为直接提示入库，不自动 reload
    reportChunkFail(error)
    return true
  }
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
  const endpoint = import.meta.env.VITE_ERROR_REPORT_URL
  if (endpoint) {
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
      url: location.href,
      userAgent: navigator.userAgent,
      extra,
      ts: Date.now()
    }
    // sendBeacon 保证页面关闭时也能发出去
    navigator.sendBeacon?.(endpoint, JSON.stringify(payload))
  }
}

export function setupErrorHandlers(app, router) {
  // Vue 组件渲染错误（会继续冒泡，ErrorBoundary 已拦截的不会再到这里）
  app.config.errorHandler = (err, instance, info) => {
    track('capture.vue.render')
    reportError(err, { phase: 'vue.render', info })
  }

  window.addEventListener('error', (e) => {
    // 仅在确有 error 对象时计数：资源加载失败（只有 event、无 error）会污染捕获数
    if (e.error) track('capture.window.error')
    reportError(e.error || e, { phase: 'window.error' })
  })

  window.addEventListener('unhandledrejection', (e) => {
    track('capture.unhandledrejection')
    reportError(e.reason, { phase: 'unhandledrejection' })
  })

  router.onError((error, to) => {
    track('capture.router')
    // to 是本次失败导航的目标路由（回调第二参数，error 对象本身没有它）
    if (isChunkLoadError(error)) {
      const fullPath = to?.fullPath
      if (fullPath && triggerChunkRecovery(fullPath, error)) return // 已接管：reload 或提示
      reportError(error, { phase: 'router.chunk' }) // 无目标路由的裸 import()：无法恢复
    } else {
      reportError(error, { phase: 'router' })
    }
  })
}
