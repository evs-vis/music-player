import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'

export const usePlayerStore = defineStore(
  'player',
  () => {
    // ===== state =====
    const currentSong = ref(null)
    const playlist = ref([])
    const currentIndex = ref(-1)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const playMode = ref('loop') // loop | one | shuffle
    // 音量：localStorage 非法值（NaN/越界）时兜底为 1（#16）
    const storedVolume = parseFloat(localStorage.getItem('volume') || '1')
    const volume = ref(Number.isFinite(storedVolume) ? Math.max(0, Math.min(1, storedVolume)) : 1)
    const lastVolume = ref(1)
    const seekTime = ref(null)
    // 进度条拖动中标记：拖动时抑制 timeupdate 写回，避免进度条回弹（#10）
    const isDragging = ref(false)
    // 音频缓冲中：由 useAudio 的 waiting/canplay 事件驱动，UI 据此显示加载态
    const isBuffering = ref(false)
    // 音频加载/播放出错标记：由 useAudio 的 error 事件置真，UI 据此显示重试入口
    const audioError = ref(false)
    // 用户点击"重试"后置真，App.vue watch 到后调用 useAudio.retryPlayback 并复位
    const retryRequested = ref(false)
    // 在遇到浏览器自动播放限制时，标记需要在用户交互后恢复播放
    const resumeOnGesture = ref(false)

    // ===== getters =====
    const progress = computed(() => {
      if (duration.value === 0) return 0
      return (currentTime.value / duration.value) * 100
    })

    const currentTimeFormatted = computed(() => formatTime(currentTime.value))
    const durationFormatted = computed(() => formatTime(duration.value))

    function formatTime(seconds) {
      if (!isFinite(seconds) || seconds < 0) return '0:00'
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // ===== actions =====

    // 列表接口（/api/songs）剥离了 lyrics 字段，播放/切歌时按需拉取详情补全歌词
    async function fetchLyrics(id) {
      if (!id) return
      try {
        const res = await request.get(`/api/songs/${id}`)
        const lyrics = res.lyrics
        // 仅在仍是同一首歌时写入，避免快速切歌时旧歌词覆盖新歌
        if (currentSong.value?.id === id && lyrics && lyrics.length) {
          currentSong.value = { ...currentSong.value, lyrics }
        }
      } catch {
        // 歌词加载失败不影响播放，静默降级为"暂无歌词"
      }
    }

    // 切换当前歌曲：同步重置进度/时长，避免新歌进度条从旧时间点起跳（#15）
    function setCurrentSong(song) {
      currentSong.value = song ? { ...song } : null
      currentTime.value = 0
      duration.value = 0
      seekTime.value = null
      // 列表接口（/api/songs）剥离了 lyrics 字段，播放/切歌时按需拉取详情补全歌词
      if (song && !song.lyrics) fetchLyrics(song.id)
    }

    function setPlaylist(songs, startIndex = 0) {
      playlist.value = Array.isArray(songs) ? [...songs] : []
      currentIndex.value = startIndex
      if (playlist.value.length > 0) {
        // 用新对象触发 watch
        setCurrentSong(playlist.value[startIndex])
      }
    }

    function addToPlaylist(song) {
      if (!song) return
      if (!playlist.value.some((s) => s.id === song.id)) {
        playlist.value.push(song)
      }
      if (!currentSong.value) {
        setCurrentSong(song)
        currentIndex.value = playlist.value.length - 1
      }
    }

    function playSong(songOrIndex, list) {
      if (typeof songOrIndex === 'number') {
        const index = songOrIndex
        if (index >= 0 && index < playlist.value.length) {
          currentIndex.value = index
          setCurrentSong(playlist.value[index])
          isPlaying.value = true
        }
      } else if (songOrIndex && typeof songOrIndex === 'object') {
        const song = songOrIndex
        if (list && Array.isArray(list)) {
          setPlaylist(
            list,
            list.findIndex((s) => s.id === song.id)
          )
        } else {
          const idx = playlist.value.findIndex((s) => s.id === song.id)
          if (idx === -1) {
            addToPlaylist(song)
          } else {
            currentIndex.value = idx
            setCurrentSong(song)
          }
        }
        isPlaying.value = true
      }
    }

    function togglePlay() {
      isPlaying.value = !isPlaying.value
    }

    function setPlaying(state) {
      isPlaying.value = !!state
    }

    function setBuffering(state) {
      isBuffering.value = !!state
    }

    // 音频出错标记：error 事件置真（UI 显示重试），重新加载/成功播放时置假
    function setAudioError(state) {
      audioError.value = !!state
    }

    // 请求重试当前歌曲：由 PlayPage 重试按钮调用，App.vue watch 到后执行 useAudio.retryPlayback
    function requestRetry() {
      retryRequested.value = true
    }

    // 重试执行完成/取消后复位（由 App.vue 调用）
    function clearRetryRequest() {
      retryRequested.value = false
    }

    function playNext() {
      if (playlist.value.length === 0) return
      // currentIndex 非法时从第 0 首开始（#17）
      if (currentIndex.value < 0) currentIndex.value = 0
      if (playMode.value === 'shuffle') {
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
      } else {
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
      }
      setCurrentSong(playlist.value[currentIndex.value])
      isPlaying.value = true
    }

    function playPrev() {
      if (playlist.value.length === 0) return
      // currentIndex 非法时从第 0 首开始（#17）
      if (currentIndex.value < 0) currentIndex.value = 0
      if (currentTime.value > 3) {
        seekTime.value = 0
        return
      }
      if (playMode.value === 'shuffle') {
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
      } else {
        currentIndex.value =
          (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
      }
      setCurrentSong(playlist.value[currentIndex.value])
      isPlaying.value = true
    }

    function seekTo(time) {
      seekTime.value = time
      currentTime.value = time
    }

    // 音量统一由 persist 持久化（paths: ['volume', 'playMode']），无需手动写 localStorage
    function setVolume(vol) {
      volume.value = Math.max(0, Math.min(1, vol))
    }

    function setResumeOnGesture(val) {
      resumeOnGesture.value = !!val
    }

    function changeMode() {
      const modes = ['loop', 'one', 'shuffle']
      const idx = modes.indexOf(playMode.value)
      playMode.value = modes[(idx + 1) % modes.length]
    }

    function removeFromPlaylist(index) {
      if (playlist.value.length <= 1) return
      playlist.value.splice(index, 1)
      if (index < currentIndex.value) {
        currentIndex.value--
      } else if (index === currentIndex.value) {
        if (currentIndex.value >= playlist.value.length) {
          currentIndex.value = playlist.value.length - 1
        }
        // 删当前歌后切到下一首，重置进度（#15）
        setCurrentSong(playlist.value[currentIndex.value] || null)
      }
    }

    function clearPlaylist() {
      playlist.value = []
      currentIndex.value = -1
      currentSong.value = null
      currentTime.value = 0
      duration.value = 0
      seekTime.value = null
      isPlaying.value = false
    }

    return {
      currentSong,
      playlist,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      playMode,
      volume,
      lastVolume,
      seekTime,
      isDragging,
      isBuffering,
      audioError,
      setAudioError,
      retryRequested,
      requestRetry,
      clearRetryRequest,
      resumeOnGesture,
      setResumeOnGesture,
      progress,
      currentTimeFormatted,
      durationFormatted,
      setPlaylist,
      addToPlaylist,
      playSong,
      togglePlay,
      setPlaying,
      setBuffering,
      playNext,
      playPrev,
      seekTo,
      setVolume,
      changeMode,
      removeFromPlaylist,
      clearPlaylist
    }
  },
  {
    persist: {
      paths: ['volume', 'playMode']
    }
  }
)
