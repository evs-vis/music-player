import request from '@/utils/request'

// 获取收藏列表
export const getFavoriteService = () => {
  return request.get('/api/user/favorites')
}

// 更新收藏
export const updateFavoriteService = (songId) => {
  return request.post('/api/user/favorites', { songId })
}
