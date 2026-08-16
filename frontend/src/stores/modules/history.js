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
    try {
      const res = await getHistoryService()
      historyList.value = res.history
    } catch {
      // 加载失败静默处理：保留现有列表，避免各页 onMounted 未捕获 rejection
    }
  }

  async function addToHistory(song) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    await updateHistoryService(song.id)
    // 播放后只提交记录，不再整表拉取历史列表：
    // 本地去重置顶、最多50条，完整列表按需在「我的」页 loadHistory 获取
    const rest = historyList.value.filter((s) => s.id !== song.id)
    historyList.value = [{ ...song, playedAt: Date.now() }, ...rest].slice(0, 50)
  }

  async function clearHistory() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) return
    await deleteHistoryService()
    // 删除成功后直接本地清空，无需再整表拉取
    historyList.value = []
  }

  // 3. 暴露
  return {
    historyList,
    loadHistory,
    addToHistory,
    clearHistory
  }
})
