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
