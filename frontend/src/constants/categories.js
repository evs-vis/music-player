// 歌曲分类（id 与后端 category 字段一致，详情页按英文 id 匹配）
// 各页面共用同一份分类身份数据；卡片配色/渐变属页面展示层，留在各自页面维护
export const CATEGORIES = [
  { id: 'pop', name: '流行', icon: 'music-o' },
  { id: 'rock', name: '摇滚', icon: 'fire-o' },
  { id: 'jazz', name: '爵士', icon: 'piano-o' },
  { id: 'classical', name: '古典', icon: 'flower-o' },
  { id: 'electronic', name: '电子', icon: 'service-o' },
  { id: 'hiphop', name: '说唱', icon: 'audio-o' },
  { id: 'rnb', name: '蓝调', icon: 'like-o' },
  { id: 'ambient', name: '氛围', icon: 'cloud-o' }
]
