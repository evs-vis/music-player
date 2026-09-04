import { ref, onUnmounted } from 'vue'
import { usePlayerStore, useAuthStore, useHistoryStore } from '@/stores'
import { showToast } from 'vant'

export function useAudio() {
  const playerStore = usePlayerStore()
  const authStore = useAuthStore()

  const audio = ref(null)
  let isInternalUpdate = false
  let currentSongKey = null
  let playSeq = 0 // 递增播放序号，防止快速切歌时旧 promise 覆盖新歌（#11）
  let pendingSeek = null // metadata 未就绪时的待执行 seek（#18）
  let lastErrorToastAt = 0 // 音频错误 toast 节流，防快速切歌连弹
  let isLoading = false
  const handlers = {}

  function initAudio() {
    if (audio.value) return

    audio.value = new Audio()
    const el = audio.value
    // 只预载元数据（时长/歌词轨道），不预载整首音频：
    // 避免切歌/进播放页时后台下载整首歌浪费移动端流量，进度条/时长又能尽快可用
    el.preload = 'metadata'

    handlers.timeupdate = () => {
      // 拖动进度条中：抑制写回，避免播放头被旧值拉回
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

    // 缓冲 loading：waiting/stalled/loadstart 置真（仅播放意图时，暂停时不显示），
    // canplay/playing 置假。
    handlers.loadstart = () => {
      if (playerStore.isPlaying) playerStore.setBuffering(true)
    }
    handlers.waiting = () => {
      if (playerStore.isPlaying) playerStore.setBuffering(true)
    }
    handlers.stalled = () => {
      if (playerStore.isPlaying) playerStore.setBuffering(true)
    }
    handlers.canplay = () => {
      playerStore.setBuffering(false)
      // 能正常播放说明音频就绪，清除出错标记
      playerStore.setAudioError(false)
    }
    handlers.playing = () => {
      playerStore.setBuffering(false)
      playerStore.setAudioError(false)
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
      // 不应被 pause 事件拉回 false，否则切歌后图标闪烁/状态错乱
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
      playerStore.setBuffering(false)
      playerStore.setPlaying(false)
      // 置出错标记：UI 据此显示重试入口
      playerStore.setAudioError(true)
      // toast 节流（1.5s）：快速连点切歌可能连续触发 error，避免刷屏
      const now = Date.now()
      if (now - lastErrorToastAt > 1500) {
        lastErrorToastAt = now
        const code = el.error?.code
        const msg =
          code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? '音频格式不支持'
            : '音频加载失败，请检查网络'
        showToast(msg)
      }
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      el.addEventListener(event, handler)
    })
  }

  async function loadAndPlay(song) {
    if (!song?.url) return
    if (isLoading) {
      return
    }
    initAudio()
    const el = audio.value
    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    const nextSrc = `${baseURL}${song.url}`
    const songKey = `${song.id || song.url}:${song.url}`
    const seq = ++playSeq // 本次播放序号
    isLoading = true

    try {
      if (currentSongKey !== songKey) {
        currentSongKey = songKey
        el.pause()
        if (el.src !== nextSrc) {
          pendingSeek = null
          el.src = nextSrc
        }
      }

      if (!el.paused) {
        isLoading = false // 已经暂停的情况下，释放锁再返回
        return
      }

      await el.play()

      // 快速切歌竞态防护：await 挂起期间若已切到新歌，忽略本次的收尾操作
      if (seq !== playSeq) {
        isLoading = false
        return
      }

      if (authStore.isLoggedIn && song.id) {
        const historyStore = useHistoryStore()
        historyStore.addToHistory(song).catch(() => {})
      }
    } catch {
      if (seq === playSeq) {
        console.log('自动播放被阻止，需用户交互')
        playerStore.setPlaying(false)
      }
    } finally {
      isLoading = false
    }
  }

  function pause() {
    audio.value?.pause()
  }

  // 音频出错后手动重试：强制重新加载当前歌曲的 src 并播放
  // 重置 currentSongKey 强制走"换歌"分支（即使 src 相同也会重新 load），再走 loadAndPlay
  async function retryPlayback() {
    const song = playerStore.currentSong
    if (!song?.url) return
    isLoading = false
    currentSongKey = null // 强制 loadAndPlay 重新赋值 src → 触发重新加载
    await loadAndPlay(song)
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
    // 缓存到 loadedmetadata 后执行
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

  return { loadAndPlay, pause, play, seek, setVolume, retryPlayback }
}
