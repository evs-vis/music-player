import request from '@/utils/request'
//更新历史记录
export const updateHistoryService = (songId) => {
  return request.post('/api/user/history', { songId })
}

//获取历史记录
export const getHistoryService = () => {
  return request('/api/user/history')
}
//清空历史记录
export const deleteHistoryService = () => {
  return request.delete(`/api/user/history/`)
}

//搜索记录

//获取搜索历史
export const getSearchHistoryService = () => {
  return request('/api/user/search-history')
}
//添加搜索历史
export const updateSearchHistoryService = (keyword) => {
  return request.post('/api/user/search-history', { keyword })
}
//清空搜索历史
export const deleteSearchHistoryService = () => {
  return request.delete(`/api/user/search-history/`)
}
