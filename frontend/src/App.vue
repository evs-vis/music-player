<script setup>
import { watch } from 'vue'
import { usePlayerStore, useAuthStore } from '@/stores'
import { useAudio } from '@/composables/useAudio'
import { showToast } from 'vant'

const playerStore = usePlayerStore()
const { loadAndPlay, pause, play, seek, setVolume } = useAudio()
let lastPlaybackKey = ''
let saveTimer = null
const authStore = useAuthStore()
const saveToLocal = () => {
  try {
    const uid = authStore.user?.id
    const key = uid ? `playerState_user_${uid}` : 'playerState_guest'
    const state = {
      playlist: playerStore.playlist,
      currentIndex: playerStore.currentIndex,
      currentTime: playerStore.currentTime,
      isPlaying: playerStore.isPlaying
    }
    localStorage.setItem(key, JSON.stringify(state))
  } catch (e) {
    // ignore
    console.error(e)
  }
}

const syncPlayback = async (song) => {
  if (!song) {
    pause()
    lastPlaybackKey = ''
    return
  }

  const playbackKey = `${song.id || song.url}:${song.url}`

  if (playerStore.isPlaying) {
    if (lastPlaybackKey !== playbackKey) {
      lastPlaybackKey = playbackKey
      await loadAndPlay(song)
    } else {
      await play()
    }
  } else {
    pause()
  }
}

watch(
  () => playerStore.currentSong,
  async (song) => {
    await syncPlayback(song)
  },
  { immediate: true }
)

// 保存播放器状态到后端（节流，2s）
watch(
  () => [
    playerStore.playlist,
    playerStore.currentIndex,
    playerStore.currentTime,
    playerStore.isPlaying
  ],
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveToLocal, 2000)
  },
  { deep: true }
)

watch(
  () => playerStore.isPlaying,
  async (isPlaying, prevIsPlaying) => {
    if (!playerStore.currentSong) return

    if (isPlaying && !prevIsPlaying) {
      await syncPlayback(playerStore.currentSong)
    } else if (!isPlaying && prevIsPlaying) {
      pause()
    }
  }
)

watch(
  () => playerStore.seekTime,
  (time) => {
    if (time === null || time === undefined || !Number.isFinite(time)) return
    seek(time)
    playerStore.seekTime = null
  }
)

watch(
  () => playerStore.volume,
  (volume) => {
    setVolume(volume)
  },
  { immediate: true }
)

// 当恢复标记为 true 时，在用户首次交互（click）后尝试恢复播放
watch(
  () => playerStore.resumeOnGesture,
  (val) => {
    if (!val) return
    showToast({
      message: '需要用户交互以恢复播放，点击任意位置继续播放',
      duration: 2000
    })
    const handler = async () => {
      try {
        if (playerStore.currentSong) {
          await syncPlayback(playerStore.currentSong)
        }
      } finally {
        playerStore.setResumeOnGesture(false)
        document.removeEventListener('click', handler)
      }
    }
    document.addEventListener('click', handler, { once: true })
  }
)
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>
