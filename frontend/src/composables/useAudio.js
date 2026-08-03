// frontend/src/composables/useAudio.js
import { ref, onUnmounted } from 'vue'
import { usePlayerStore, useAuthStore, useHistoryStore } from '@/stores'

export function useAudio() {
  const playerStore = usePlayerStore()
  const authStore = useAuthStore()

  const audio = ref(null)
  let isInternalUpdate = false
  let currentSongKey = null
  let playSeq = 0 // 递增播放序号，防止快速切歌时旧 promise 覆盖新歌（#11）
  let pendingSeek = null // metadata 未就绪时的待执行 seek（#18）
  const handlers = {}

  function initAudio() {
    if (audio.value) return

    audio.value = new Audio()
    const el = audio.value

    handlers.timeupdate = () => {
      // 拖动进度条中：抑制写回，避免播放头被旧值拉回（#10）
      if (playerStore.isDragging) return
      if (!isInternalUpdate) {
        isInternalUpdate = true
        playerStore.currentTime = el.currentTime
        isInternalUpdate = false
      }
    }

    handlers.loadedmetadata = () => {
      playerStore.duration = el.duration
      // metadata 就绪后执行缓存的 seek（#18：登录恢复等场景 src 未就绪时 seek 被忽略）
      if (pendingSeek !== null) {
        el.currentTime = pendingSeek
        pendingSeek = null
      }
    }

    handlers.play = () => {
      if (!isInternalUpdate) {
        isInternalUpdate = true
        playerStore.setPlaying(true)
        isInternalUpdate = false
      }
    }

    handlers.pause = () => {
      // 切歌时 loadAndPlay 会内部 pause 旧歌，此时 store.isPlaying 为 true（切歌意图），
      // 不应被 pause 事件拉回 false，否则切歌后图标闪烁/状态错乱（#12）
      if (playerStore.isPlaying) return
      if (!isInternalUpdate) {
        isInternalUpdate = true
        playerStore.setPlaying(false)
        isInternalUpdate = false
      }
    }

    handlers.ended = () => {
      if (playerStore.playMode === 'one') {
        el.currentTime = 0
        // 循环播放由用户意图驱动，isPlaying 保持 true；防自动播放被阻止时出现未处理 rejection
        el.play().catch(() => {
          console.log('单曲循环自动播放被阻止')
          playerStore.setPlaying(false)
        })
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
    const seq = ++playSeq // 本次播放序号

    if (currentSongKey !== songKey) {
      currentSongKey = songKey
      el.pause()
      if (el.src !== nextSrc) {
        // 换歌后清除旧歌的待执行 seek，避免新歌被 seek 到旧位置（#18）
        pendingSeek = null
        el.src = nextSrc
      }
    }

    try {
      if (!el.paused) return
      await el.play()

      // 快速切歌竞态防护：await 挂起期间若已切到新歌，忽略本次的收尾操作（#11）
      if (seq !== playSeq) return

      if (authStore.isLoggedIn && song.id) {
        const historyStore = useHistoryStore()
        historyStore.addToHistory(song.id).catch(() => {})
      }
    } catch {
      // 仅当仍是最新请求时才认为播放被阻止，避免旧请求误把新歌状态改掉
      if (seq === playSeq) {
        console.log('自动播放被阻止，需用户交互')
        playerStore.setPlaying(false)
      }
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
    if (!audio.value || !isFinite(time)) return
    const el = audio.value
    // metadata 未就绪（readyState < 1）时浏览器忽略 currentTime 赋值，
    // 缓存到 loadedmetadata 后执行（#18）
    if (el.readyState < 1 && el.src) {
      pendingSeek = time
      return
    }
    el.currentTime = time
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
