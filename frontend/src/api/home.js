import request from '@/utils/request'

export const getPlaylistsService = () => {
  return request.get('/api/playlists')
}

export const getSongsService = () => {
  return request.get('/api/songs')
}
