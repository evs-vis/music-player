import request from '@/utils/request'

export const getPlaylistsService = () => {
  return request.get('/api/playlists')
}

export const getSongsService = (params) => {
  return request.get('/api/songs', { params })
}
