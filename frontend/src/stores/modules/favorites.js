import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { getFavoriteService, updateFavoriteService } from '@/api/favorite'

export const useFavoritesStore = defineStore('favorites', () => {
  // 1. state
  const favoriteSongs = ref([])
  // 是否已从服务端加载过：登录会话内避免首页/我的/播放页等跨页重复请求
  const loaded = ref(false)

  // 2. actions

  async function loadFavorites(force = false) {
    const authStore = useAuthStore()
    // 未登录时清空而非直接 return，避免登出后残留上一账号的收藏数据
    if (!authStore.isLoggedIn) {
      favoriteSongs.value = []
      loaded.value = false
      return
    }
    // 已加载过且非强制刷新时短路，避免跨页重复请求
    if (loaded.value && !force) return
    try {
      const res = await getFavoriteService()
      favoriteSongs.value = res.favorites
      loaded.value = true
    } catch {
      // 加载失败静默处理：loaded 保持 false，下次进入页面会重试；列表保留现值
    }
  }

  async function toggleFavorite(songId) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      throw new Error('请先登录')
    }
    await updateFavoriteService(songId)
    // 强制刷新列表（绕过 loaded 缓存），保证 toggle 后收藏状态即时更新
    await loadFavorites(true)
  }

  function isFavorite(songId) {
    return favoriteSongs.value.some((s) => s.id === songId)
  }

  // 3. 暴露
  return {
    favoriteSongs,
    loadFavorites,
    toggleFavorite,
    isFavorite
  }
})
