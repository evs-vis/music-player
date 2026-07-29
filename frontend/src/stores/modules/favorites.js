import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './auth'
import { getFavoriteService, updateFavoriteService } from '@/api/favorite'
export const useFavoritesStore = defineStore('favorites', () => {
  // 1. state
  const favoriteSongs = ref([])

  // 2. actions

  async function loadFavorites() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    const res = await getFavoriteService()
    favoriteSongs.value = res.data.favorites
  }

  async function toggleFavorite(song) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      throw new Error('请先登录')
    }
    await updateFavoriteService()
    // 重新加载收藏列表
    await loadFavorites()
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
