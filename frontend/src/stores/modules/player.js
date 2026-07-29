import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore(
  'player',
  () => {
    // 1. state —— 全部转为 ref 或 reactive
    const currentSong = ref(null)
    const playlist = ref([])
    const currentIndex = ref(-1)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const playMode = ref('loop') // loop | one | shuffle
    const volume = ref(parseFloat(localStorage.getItem('volume') || '1'))

    // 2. actions —— 转为普通函数

    function setPlaylist(songs, startIndex = 0) {
      playlist.value = songs
      currentIndex.value = startIndex
      if (songs.length > 0) {
        currentSong.value = songs[startIndex]
      }
    }

    function addToPlaylist(song) {
      playlist.value.push(song)
      if (!currentSong.value) {
        currentSong.value = song
        currentIndex.value = playlist.value.length - 1
      }
    }

    function playSong(index) {
      if (index >= 0 && index < playlist.value.length) {
        currentIndex.value = index
        currentSong.value = playlist.value[index]
        isPlaying.value = true
      }
    }

    function togglePlay() {
      isPlaying.value = !isPlaying.value
    }

    function next() {
      if (playlist.value.length === 0) return
      if (playMode.value === 'shuffle') {
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
      } else {
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
      }
      currentSong.value = playlist.value[currentIndex.value]
      isPlaying.value = true
    }

    function prev() {
      if (playlist.value.length === 0) return
      if (playMode.value === 'shuffle') {
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
      } else {
        currentIndex.value =
          (currentIndex.value - 1 + playlist.value.length) %
          playlist.value.length
      }
      currentSong.value = playlist.value[currentIndex.value]
      isPlaying.value = true
    }

    function setProgress(time) {
      currentTime.value = time
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

    // 3. 暴露所有需要使用的状态和方法
    return {
      currentSong,
      playlist,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      playMode,
      volume,
      setPlaylist,
      addToPlaylist,
      playSong,
      togglePlay,
      next,
      prev,
      setProgress,
      setVolume,
      changeMode
    }
  },
  {
    persist: {
      paths: ['volume', 'playMode', 'playlist', 'currentIndex', 'currentSong']
    }
  }
)
