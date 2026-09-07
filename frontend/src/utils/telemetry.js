// utils/telemetry.js
// 轻量「错误捕获 / 自愈」计数采集（只采聚合计数，不携带 URL/stack/用户等隐私）：
//   - track(name)：本地 localStorage 累加计数
//   - flush()：批量 POST 到本项目后端 /api/metrics（fetch keepalive + JSON），仅收到 2xx 才清本地并推进批次号
//   - 每批带 sessionId + 单调 batchNo：服务端按 session 记 lastBatchNo 去重，
//     因此「已送达但响应丢失 / 页面切后台未确认」的残留批次重投时不会重复入库。
//
// 本文件零 import（errorHandler/request/useAudio 单向依赖它），避免循环引用。
// 计数语义：这里只负责传输；捕获/恢复事件由各层 handler 在入口各自 track。

const STORAGE_KEY = 'mp_metrics'

function makeSessionId() {
  const rand = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : rand()
  } catch {
    return rand()
  }
}

function load() {
  const fresh = { sid: makeSessionId(), batchNo: 0, events: {} }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (raw && typeof raw === 'object') {
      return {
        sid: typeof raw.sid === 'string' && raw.sid ? raw.sid : fresh.sid,
        batchNo: Number.isInteger(raw.batchNo) && raw.batchNo >= 0 ? raw.batchNo : 0,
        events: raw.events && typeof raw.events === 'object' ? raw.events : {}
      }
    }
  } catch {
    /* localStorage 损坏/不可用时重建 */
  }
  return fresh
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 容量/隐私模式异常时静默 */
  }
}

// 累加一个计数事件
export function track(name) {
  if (!name) return
  const state = load()
  state.events[name] = (state.events[name] || 0) + 1
  save(state)
}

// 本地未上报的计数（调试用）
export function getLocalCounts() {
  return { ...load().events }
}

// 把本地计数批量上报；返回是否收到 2xx。
// 收到 2xx 才推进 batchNo 并清空本地——即便服务端因去重而"跳过"本次，也视为送达（可安全清空）。
// 失败则保留本地与同 batchNo，下次以相同批次号重投，不会双计。
export async function flush() {
  const state = load()
  const events = state.events
  if (!events || !Object.keys(events).length) return true

  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  try {
    const res = await fetch(`${base}/api/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: state.sid,
        batchNo: state.batchNo,
        events,
        ts: Date.now(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      }),
      keepalive: true
    })
    if (res.ok) {
      save({ ...state, batchNo: state.batchNo + 1, events: {} })
      return true
    }
    return false
  } catch {
    return false
  }
}

let initialized = false
export function initTelemetry() {
  if (initialized) return
  initialized = true
  // 页面前台切后台 / 关闭：自然上报点。keepalive 保证请求随页面关闭送达；
  // 若页面未真正关闭，残留批次会在下次 ack 后由服务端去重并清空。
  const bestEffortFlush = () => {
    flush()
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') bestEffortFlush()
  })
  window.addEventListener('pagehide', bestEffortFlush)
  // 测试/手动精确收口：await window.__metricsFlush() 后读取后端聚合
  if (typeof window !== 'undefined') {
    window.__metricsFlush = flush
  }
}
