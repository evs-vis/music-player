// frontend/src/composables/useAudio.js
import { ref, onUnmounted } from 'vue'
import { usePlayerStore, useAuthStore, useHistoryStore } from '@/stores'

export function useAudio() {
  const playerStore = usePlayerStore()
  const authStore = useAuthStore()

  const audio = ref(null)
  let isInternalUpdate = false
  let currentSongKey = null
  const handlers = {}

  function initAudio() {
    if (audio.value) return

    audio.value = new Audio()
    const el = audio.value

    handlers.timeupdate = () => {
      if (!isInternalUpdate) {
        isInternalUpdate = true
        playerStore.currentTime = el.currentTime
        isInternalUpdate = false
      }
    }

    handlers.loadedmetadata = () => {
      playerStore.duration = el.duration
    }

    handlers.play = () => {
      if (!isInternalUpdate) {
        isInternalUpdate = true
        playerStore.setPlaying(true)
        isInternalUpdate = false
      }
    }

    handlers.pause = () => {
      if (!isInternalUpdate) {
        isInternalUpdate = true
        playerStore.setPlaying(false)
        isInternalUpdate = false
      }
    }

    handlers.ended = () => {
      if (playerStore.playMode === 'one') {
        el.currentTime = 0
        el.play()
      } else {
        playerStore.playNext()
      }
    }

    handlers.error = (e) => {
      console.error('音频播放出错:', e)
      playerStore.setPlaying(false)
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      el.addEventListener(event, handler)
    })
  }

  async function loadAndPlay(song) {
    if (!song?.url) return

    initAudio()
    const el = audio.value
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const nextSrc = `${baseURL}${song.url}`
    const songKey = `${song.id || song.url}:${song.url}`

    if (currentSongKey !== songKey) {
      currentSongKey = songKey
      el.pause()
      if (el.src !== nextSrc) {
        el.src = nextSrc
      }
    }

    try {
      if (!el.paused) return
      await el.play()

      if (authStore.isLoggedIn && song.id) {
        const historyStore = useHistoryStore()
        historyStore.addToHistory(song.id).catch(() => {})
      }
    } catch (error) {
      console.log('自动播放被阻止，需用户交互')
      playerStore.setPlaying(false)
    }
  }

  function pause() {
    audio.value?.pause()
  }

  async function play() {
    if (!audio.value || !audio.value.paused) return

    try {
      await audio.value.play()
    } catch (error) {
      console.log('播放失败:', error)
    }
  }

  function seek(time) {
    if (audio.value && isFinite(time)) {
      audio.value.currentTime = time
    }
  }

  function setVolume(vol) {
    if (audio.value) {
      audio.value.volume = Math.max(0, Math.min(1, vol))
    }
  }

  onUnmounted(() => {
    if (audio.value) {
      Object.entries(handlers).forEach(([event, handler]) => {
        audio.value.removeEventListener(event, handler)
      })
      audio.value.pause()
      audio.value.src = ''
    }
  })

  return { audio, loadAndPlay, pause, play, seek, setVolume }
}
