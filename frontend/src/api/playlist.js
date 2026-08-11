import request from '@/utils/request'
import { createMemoryCache } from '@/utils/memoryCache'

// 列表接口内存缓存（TTL 60s）：首页/歌单/详情/搜索多个页面复用同一数据源，
// 命中缓存不再发网络请求，避免跨页重复请求。调用方均为只读（slice/filter 生成新数组）。
const cache = createMemoryCache({ ttl: 60000 })

export const getPlaylistsService = () => {
  const key = 'playlists'
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  return request.get('/api/playlists').then((res) => {
    cache.set(key, res)
    return res
  })
}

export const getSongsService = (params) => {
  const key = `songs:${JSON.stringify(params || {})}`
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  return request.get('/api/songs', { params }).then((res) => {
    cache.set(key, res)
    return res
  })
}
