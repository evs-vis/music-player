<script setup>
import { watch } from 'vue'
import { usePlayerStore } from '@/stores'
import { useAudio } from '@/composables/useAudio'

const playerStore = usePlayerStore()
const { loadAndPlay, pause, play, seek, setVolume } = useAudio()
let lastPlaybackKey = ''

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
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>
