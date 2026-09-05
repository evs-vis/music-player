import request from '@/utils/request'
import { createMemoryCache } from '@/utils/memoryCache'

// 列表接口内存缓存（TTL 60s）：首页/歌单/详情/搜索多个页面复用同一数据源，
// 命中缓存不再发网络请求，避免跨页重复请求。调用方均为只读（slice/filter 生成新数组）。
const cache = createMemoryCache({ ttl: 60000 })
const pendingRequests = new Map()

function requestWithDedupe(key, requestFn) {
  // 1. 先看缓存
  const cached = cache.get(key)
  if (cached !== null && cached !== undefined) {
    return Promise.resolve(cached)
  }

  // 2. 看是否有正在进行的相同请求
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }

  // 3. 发起新请求，存入 pending
  const promise = requestFn()
    .then((res) => {
      cache.set(key, res)
      pendingRequests.delete(key) // 请求完成，移除 pending
      return res
    })
    .catch((err) => {
      pendingRequests.delete(key) // 失败也要移除，否则后续请求会被卡死
      throw err
    })

  pendingRequests.set(key, promise)
  return promise
}
export const getPlaylistsService = () => {
  const key = 'playlists'
  return requestWithDedupe(key, () => request.get('/api/playlists'))
}

export const getSongsService = (params) => {
  const key = `songs:${JSON.stringify(params || {})}`
  return requestWithDedupe(key, () => request.get('/api/songs', { params }))
}
