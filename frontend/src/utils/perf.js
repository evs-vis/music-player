// 轻量性能监控：原生 PerformanceObserver 采集 FCP/LCP/CLS/TBT，零依赖。
// 页面隐藏/关闭时上报（sendBeacon 可选）+ localStorage 留存最近 20 条，可离线回溯。
// 口径说明：PerformanceObserver 带 buffered: true，可覆盖 JS 启动前已发生的条目。
const metrics = { fcp: null, lcp: null, cls: 0, tbt: 0 }

if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    // First Contentful Paint（首屏绘制）
    new PerformanceObserver((list) => {
      const entry = list.getEntries().find((x) => x.name === 'first-contentful-paint')
      if (entry) metrics.fcp = Math.round(entry.startTime)
    }).observe({ type: 'paint', buffered: true })
  } catch {
    /* 旧浏览器无 paint */
  }

  try {
    // Largest Contentful Paint（最大内容绘制）
    new PerformanceObserver((list) => {
      const entry = list.getEntries().pop()
      if (entry) metrics.lcp = Math.round(entry.startTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    /* 旧浏览器无 lcp */
  }

  try {
    // Cumulative Layout Shift（累计布局偏移）
    new PerformanceObserver((list) => {
      metrics.cls += list.getEntries().reduce((sum, x) => sum + (x.value || 0), 0)
    }).observe({ type: 'layout-shift', buffered: true })
  } catch {
    /* 旧浏览器无 layout-shift */
  }

  try {
    // Total Blocking Time（长任务累计阻塞，>50ms 部分）
    new PerformanceObserver((list) => {
      metrics.tbt += list.getEntries().reduce((sum, x) => sum + Math.max(0, x.duration - 50), 0)
    }).observe({ type: 'longtask', buffered: true })
  } catch {
    /* mobile Safari 无 longtask */
  }
}

function report() {
  const payload = {
    ...metrics,
    url: location.pathname,
    ts: Date.now()
  }
  console.table(payload)
  const endpoint = import.meta.env.VITE_PERF_ENDPOINT
  if (endpoint) navigator.sendBeacon?.(endpoint, JSON.stringify(payload))
  const history = JSON.parse(localStorage.getItem('perf_history') || '[]')
  history.push(payload)
  localStorage.setItem('perf_history', JSON.stringify(history.slice(-20)))
}

// 页面隐藏或关闭时上报（visibilitychange 在切后台/回前台各触发一次，仅 hidden 上报）
if (typeof window !== 'undefined') {
  ;['pagehide', 'visibilitychange'].forEach((ev) => {
    window.addEventListener(ev, () => {
      if (ev === 'pagehide' || document.visibilityState === 'hidden') report()
    })
  })
}
