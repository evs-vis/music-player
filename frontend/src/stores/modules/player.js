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
    const volume = ref(parseFloat(localStorage.getItem('volume') || '1'))
    const lastVolume = ref(1)
    const seekTime = ref(null)

    // ===== getters =====
    const hasCurrentSong = computed(() => currentSong.value !== null)

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

    function setPlaylist(songs, startIndex = 0) {
      playlist.value = Array.isArray(songs) ? [...songs] : []
      currentIndex.value = startIndex
      if (playlist.value.length > 0) {
        // 用新对象触发 watch
        currentSong.value = { ...playlist.value[startIndex] }
      }
    }

    function addToPlaylist(song) {
      if (!song) return
      if (!playlist.value.some((s) => s.id === song.id)) {
        playlist.value.push(song)
      }
      if (!currentSong.value) {
        currentSong.value = { ...song }
        currentIndex.value = playlist.value.length - 1
      }
    }

    function playSong(songOrIndex, list) {
      if (typeof songOrIndex === 'number') {
        const index = songOrIndex
        if (index >= 0 && index < playlist.value.length) {
          currentIndex.value = index
          currentSong.value = { ...playlist.value[index] }
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
          }
          currentSong.value = { ...song }
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
      if (playMode.value === 'shuffle') {
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
      } else {
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
      }
      currentSong.value = { ...playlist.value[currentIndex.value] }
      isPlaying.value = true
    }

    function playPrev() {
      if (playlist.value.length === 0) return
      if (currentTime.value > 3) {
        seekTime.value = 0
        return
      }
      if (playMode.value === 'shuffle') {
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
      } else {
        currentIndex.value =
          (currentIndex.value - 1 + playlist.value.length) %
          playlist.value.length
      }
      currentSong.value = { ...playlist.value[currentIndex.value] }
      isPlaying.value = true
    }

    function prev() {
      playPrev()
    }

    function next() {
      playNext()
    }

    function seekTo(time) {
      seekTime.value = time
      currentTime.value = time
    }

    function setProgress(time) {
      seekTo(time)
    }

    function setVolume(vol) {
      volume.value = Math.max(0, Math.min(1, vol))
      localStorage.setItem('volume', String(volume.value))
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
        currentSong.value = playlist.value[currentIndex.value]
          ? { ...playlist.value[currentIndex.value] }
          : null
      }
    }

    function clearPlaylist() {
      playlist.value = []
      currentIndex.value = -1
      currentSong.value = null
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
      hasCurrentSong,
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
      prev,
      next,
      seekTo,
      setProgress,
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
