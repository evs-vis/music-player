import request from '@/utils/request'

export const getPlayerStateService = () => {
  return request.get('/api/user/player')
}

export const savePlayerStateService = (state) => {
  return request.post('/api/user/player', state)
}
