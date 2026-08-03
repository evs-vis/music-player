import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { deleteHistoryService, getHistoryService, updateHistoryService } from '@/api/history'

export const useHistoryStore = defineStore('history', () => {
  // 1. state
  const historyList = ref([])

  // 2. actions

  async function loadHistory() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    const res = await getHistoryService()
    historyList.value = res.history
  }

  async function addToHistory(songId) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    await updateHistoryService(songId)
    await loadHistory() // 直接调用 loadHistory 函数
  }

  async function clearHistory() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    await deleteHistoryService()
    historyList.value = []
    await loadHistory()
  }

  // 3. 暴露
  return {
    historyList,
    loadHistory,
    addToHistory,
    clearHistory
  }
})
