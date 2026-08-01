<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores'
import { useFavoritesStore } from '@/stores'
import { useAuthStore } from '@/stores'
import { showNotify } from 'vant'
import PlaylistSheet from '@/components/PlaylistSheet.vue'

const router = useRouter()
const playerStore = usePlayerStore()
const favoritesStore = useFavoritesStore()
const authStore = useAuthStore()

const modeConfig = {
  loop: { icon: 'orders-o', color: '#27ae60' },
  one: { icon: 'replay', color: '#e74c3c' },
  shuffle: { icon: 'exchange', color: '#f39c12' }
}

// 播放列表弹层开关
const showPlaylistSheet = ref(false)

// 音量滑块可见性
const showVolumeSlider = ref(false)

// 当前歌曲
const currentSong = computed(() => playerStore.currentSong)

// 进度百分比
const progress = computed(() => {
  if (!playerStore.duration) return 0
  return (playerStore.currentTime / playerStore.duration) * 100
})

// 格式化时间
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 播放模式图标映射
const modeIcon = computed(
  () => modeConfig[playerStore.playMode]?.icon || 'orders-o'
)
const modeColor = computed(
  () => modeConfig[playerStore.playMode]?.color || '#27ae60'
)
// const modeText = computed(
//   () => modeConfig[playerStore.playMode]?.text || '列表循环'
// )

const modeActive = computed(() => true)

// 收藏状态
const isFav = computed(() => {
  if (!currentSong.value) return false // ← 加这行
  return favoritesStore.favoriteSongs.some((s) => s.id === currentSong.value.id)
})

// 歌词处理
const currentLyricIndex = computed(() => {
  const lyrics = currentSong.value?.lyrics
  if (!lyrics || lyrics.length === 0) return -1
  const time = playerStore.currentTime
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (time >= lyrics[i].time) return i
  }
  return 0
})

// 拖动进度条
const seek = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.touches ? event.touches[0].clientX : event.clientX
  const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
  playerStore.seekTo(ratio * playerStore.duration)
}

// 播放/暂停
const togglePlay = () => {
  playerStore.togglePlay()
}

// 上下曲
const prev = () => playerStore.playPrev()
const next = () => playerStore.playNext()

// 切换模式
const changeMode = () => playerStore.changeMode()

// 收藏切换
const toggleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    showNotify({ type: 'warning', message: '请先登录' })
    return
  }
  try {
    // console.log('currentSong.value', currentSong.value.id)
    await favoritesStore.toggleFavorite(currentSong.value.id)
  } catch {
    showNotify({ type: 'danger', message: '操作失败' })
  }
}

// 音量控制
const toggleMute = () => {
  if (playerStore.volume > 0) {
    playerStore.lastVolume = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(playerStore.lastVolume || 1)
  }
}

const setVolume = (val) => {
  playerStore.setVolume(val)
}

// 无歌曲时重定向
watch(
  () => playerStore.currentSong,
  (val) => {
    if (!val) {
      router.replace('/home')
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (authStore.isLoggedIn) {
    favoritesStore.loadFavorites()
  }
})
</script>

<template>
  <div class="play-page" v-if="currentSong">
    <!-- 模糊背景 -->
    <div
      class="bg-blur"
      :style="{ backgroundImage: `url(${currentSong.cover})` }"
    />

    <!-- 头部导航 -->
    <header class="play-header">
      <button class="header-btn" @click="router.back()">
        <van-icon name="arrow-down" size="22" color="#fff" />
      </button>
      <div class="header-info">
        <span class="subtitle">Now Playing</span>
        <span class="title-text">{{ currentSong.title }}</span>
      </div>
      <button class="header-btn">
        <van-icon name="ellipsis" size="22" color="#fff" />
      </button>
    </header>

    <!-- 歌曲信息与封面 -->
    <main class="play-main">
      <div
        class="album-art-wrapper"
        :class="{ 'is-paused': !playerStore.isPlaying }"
      >
        <div class="album-art">
          <van-image
            :src="currentSong.cover"
            width="100%"
            height="100%"
            fit="cover"
            radius="12px"
          />
          <!-- 黑胶唱片覆盖层 -->
          <div class="vinyl-overlay" />
        </div>
      </div>

      <div class="song-info">
        <h1 class="song-title">{{ currentSong.title }}</h1>
        <p class="song-artist">{{ currentSong.artist }}</p>
      </div>

      <!-- 歌词区域 -->
      <div class="lyrics-container">
        <div v-if="currentSong.lyrics?.length" class="lyrics-list">
          <p
            v-for="(line, index) in currentSong.lyrics"
            :key="index"
            class="lyric-line"
            :class="{ active: index === currentLyricIndex }"
          >
            {{ line.text }}
          </p>
        </div>
        <p v-else class="no-lyrics">暂无歌词</p>
      </div>
    </main>

    <!-- 底部控制面板 -->
    <footer class="play-footer">
      <div class="glass-panel">
        <!-- 进度条 -->
        <div class="progress-area">
          <div class="time-labels">
            <span>{{ formatTime(playerStore.currentTime) }}</span>
            <span>{{ formatTime(playerStore.duration) }}</span>
          </div>
          <div
            class="progress-bar"
            @mousedown="seek"
            @touchstart="seek"
            @touchmove="seek"
          >
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progress + '%' }">
                <div class="progress-thumb" />
              </div>
            </div>
          </div>
        </div>

        <!-- 播放控制 -->
        <div class="controls">
          <div class="main-buttons">
            <button @click="prev">
              <van-icon name="arrow-left" size="36" />
            </button>
            <button class="play-btn" @click="togglePlay">
              <van-icon
                :name="
                  playerStore.isPlaying ? 'pause-circle-o' : 'play-circle-o'
                "
                size="48"
              />
            </button>
            <button @click="next">
              <van-icon name="arrow" size="36" />
            </button>
          </div>
        </div>

        <!-- 底部操作栏与音量 -->
        <div class="actions-area">
          <div class="left-actions">
            <button @click="toggleFavorite">
              <van-icon
                :name="isFav ? 'like' : 'like-o'"
                :color="isFav ? '#E74C3C' : '#fff'"
                size="20"
              />
              <span>Like</span>
            </button>
            <div class="volume-control">
              <button @click="toggleMute">
                <van-icon
                  :name="playerStore.volume === 0 ? 'volume-o' : 'volume'"
                  size="20"
                  color="#fff"
                />
              </button>
              <div v-if="showVolumeSlider" class="volume-slider-wrapper">
                <van-slider
                  v-model="playerStore.volume"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  @update:model-value="setVolume"
                  style="width: 80px"
                />
              </div>
            </div>
          </div>
          <div class="right-actions">
            <button @click="showPlaylistSheet = true">
              <van-icon name="add-o" size="20" color="#fff" />
            </button>
            <button @click="changeMode" :class="{ active: modeActive }">
              <van-icon :name="modeIcon" :color="modeColor" size="24" />
            </button>
          </div>
        </div>
      </div>
    </footer>

    <!-- 播放列表弹层 -->
    <PlaylistSheet v-model:show="showPlaylistSheet" />
  </div>
</template>

<style lang="scss" scoped>
.play-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: #000;
  overflow: hidden;
  color: #fff;
}

// 模糊背景
.bg-blur {
  position: absolute;
  inset: -10px;
  background-size: cover;
  background-position: center;
  filter: blur(30px);
  opacity: 0.5;
  transform: scale(1.1);
  z-index: 0;
}

// 头部
.play-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $md $safe-margin;
  margin-top: 12px;
}

.header-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: none;
  cursor: pointer;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.95);
  }
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 200px;
  overflow: hidden;
}

.subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.title-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

// 主要内容
.play-main {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 $safe-margin;
  gap: $lg;
}

// 专辑封面
.album-art-wrapper {
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1;
  transition: animation-play-state 0.5s;

  &.is-paused .album-art {
    animation-play-state: paused;
  }
}

.album-art {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  position: relative;
  animation: rotate-slow 20s linear infinite;
}

.vinyl-overlay {
  position: absolute;
  inset: 0;
  border: 8px solid rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  pointer-events: none;
}

@keyframes rotate-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 歌曲信息
.song-info {
  text-align: center;
  max-width: 280px;
}

.song-title {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 $xs;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

// 歌词区域
.lyrics-container {
  width: 100%;
  max-height: 80px;
  overflow-y: auto;
  text-align: center;
  padding: 0 $sm;
  mask-image: linear-gradient(to bottom, black 60%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent);

  &::-webkit-scrollbar {
    display: none;
  }
}

.lyric-line {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 4px 0;
  transition:
    color 0.3s,
    font-size 0.3s;

  &.active {
    color: $primary-color;
    font-size: 16px;
    font-weight: 600;
  }
}

.no-lyrics {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}

// 底部控制面板
.play-footer {
  position: relative;
  z-index: 10;
  padding: 0 $safe-margin $xl;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: $lg;
  display: flex;
  flex-direction: column;
  gap: $lg;
}

// 进度条
.progress-area {
  width: 100%;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: $xs;
}

.progress-bar {
  width: 100%;
  height: 16px;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: visible;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: $primary-color;
  border-radius: 2px;
  position: relative;
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

// 控制按钮
.controls {
  display: flex;
  justify-content: center;
  align-items: center;

  button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 8px;
    transition:
      color 0.2s,
      transform 0.2s;

    &.active {
      color: $primary-color;
    }

    &:active {
      transform: scale(0.9);
    }
  }
}

.main-buttons {
  display: flex;
  align-items: center;
  gap: $lg;

  .play-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }
  }
}

// 底部操作
.actions-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $sm;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: $lg;

  button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    gap: $xs;
    cursor: pointer;
    font-size: 14px;

    &:active {
      opacity: 0.8;
    }
  }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: $sm;
  position: relative;
}

.volume-slider-wrapper {
  position: absolute;
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  padding: 8px;
  border-radius: 20px;
}

.right-actions {
  display: flex;
  gap: $lg;

  button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background 0.2s;

    &:active {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
