import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import {
  getSearchHistoryService,
  updateSearchHistoryService,
  deleteSearchHistoryService
} from '@/api/history'

export const useSearchHistoryStore = defineStore('searchHistory', () => {
  const searchHistory = ref([])

  async function loadHistory() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      searchHistory.value = []
      return
    }
    try {
      const res = await getSearchHistoryService()
      searchHistory.value = res.history || []
    } catch {
      searchHistory.value = []
    }
  }

  async function addHistory(keyword) {
    const res = await updateSearchHistoryService(keyword)
    searchHistory.value = res.history || []
  }

  async function clearHistory() {
    await deleteSearchHistoryService()
    searchHistory.value = []
  }

  return { searchHistory, loadHistory, addHistory, clearHistory }
})
