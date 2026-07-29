import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './auth'

export const useHistoryStore = defineStore('history', () => {
  // 1. state
  const historyList = ref([])

  // 2. actions

  async function loadHistory() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    try {
      const res = await axios.get('/api/user/history', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      historyList.value = res.data.history
    } catch (err) {
      console.error('加载播放历史失败', err)
    }
  }

  async function addToHistory(songId) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    try {
      await axios.post(
        '/api/user/history',
        { songId },
        {
          headers: { Authorization: `Bearer ${authStore.token}` }
        }
      )
      await loadHistory() // 直接调用 loadHistory 函数
    } catch (err) {
      console.error('添加播放历史失败', err)
    }
  }

  async function clearHistory() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    try {
      await axios.delete('/api/user/history', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      historyList.value = []
    } catch (err) {
      console.error('清空历史失败', err)
    }
  }

  // 3. 暴露
  return {
    historyList,
    loadHistory,
    addToHistory,
    clearHistory
  }
})
