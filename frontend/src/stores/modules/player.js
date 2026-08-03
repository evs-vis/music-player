import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

    // 切换当前歌曲：同步重置进度/时长，避免新歌进度条从旧时间点起跳（#15）
    function setCurrentSong(song) {
      currentSong.value = song ? { ...song } : null
      currentTime.value = 0
      duration.value = 0
      seekTime.value = null
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
