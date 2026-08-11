// 轻量内存缓存：Map + TTL 过期，用于避免跨页面重复请求同参接口
export function createMemoryCache({ ttl = 60000 } = {}) {
  const map = new Map()
  return {
    get(key) {
      const hit = map.get(key)
      if (!hit) return null
      if (Date.now() - hit.time > ttl) {
        map.delete(key)
        return null
      }
      return hit.value
    },
    set(key, value) {
      map.set(key, { value, time: Date.now() })
    },
    clear() {
      map.clear()
    }
  }
}
