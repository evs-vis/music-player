<script setup>
import { ref, watch } from 'vue'
import { usePlayerStore, useAuthStore } from '@/stores'
import { useAudio } from '@/composables/useAudio'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { showToast } from 'vant'

const playerStore = usePlayerStore()
const { loadAndPlay, pause, play, seek, setVolume, retryPlayback } = useAudio()
// ErrorBoundary 触发重试时递增，强制 router-view 重挂载当前路由组件
const errorRetryKey = ref(0)
let lastPlaybackKey = ''
let saveTimer = null
const authStore = useAuthStore()

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
  () => ({
    song: playerStore.currentSong,
    playing: playerStore.isPlaying
  }),
  async ({ song, playing }) => {
    // 无歌曲时直接暂停
    if (!song) {
      pause()
      lastPlaybackKey = ''
      return
    }

    const playbackKey = `${song.id || song.url}:${song.url}`

    if (playing) {
      // 需要播放：判断是否是新歌
      if (lastPlaybackKey !== playbackKey) {
        lastPlaybackKey = playbackKey
        await loadAndPlay(song)
      } else {
        await play()
      }
    } else {
      // 暂停
      pause()
    }
  },
  { immediate: true }
)
// 保存播放器状态到 localStorage（节流，2s）
// 拆成两个 watch：playlist 可能 push/splice 而不改 currentIndex（addToPlaylist），
// 需保留 deep 监听；高频 currentTime（约 4 次/秒）走浅监听，避免每次更新深遍历整个 playlist 对象树
const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => playerStore.savePlayerSnapshot(authStore.user?.id), 2000)
}

watch(() => playerStore.playlist, scheduleSave, { deep: true })
watch(
  () => [playerStore.currentIndex, playerStore.currentTime, playerStore.isPlaying],
  scheduleSave
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

// 播放页点击"重试"：由 store 标记触发，重新加载当前歌曲；失败标记复位交给 audio 事件
watch(
  () => playerStore.retryRequested,
  async (val) => {
    if (!val) return
    playerStore.clearRetryRequest()
    await retryPlayback()
  }
)
</script>

<template>
  <div id="app">
    <ErrorBoundary @retry="errorRetryKey++">
      <router-view :key="errorRetryKey" />
    </ErrorBoundary>
  </div>
</template>
