<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '@/stores'
import { showNotify } from 'vant'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show'])

const playerStore = usePlayerStore()

// 控制弹出层显示
const sheetVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// 当前播放列表
const playlist = computed(() => playerStore.playlist)
const currentIndex = computed(() => playerStore.currentIndex)

// 播放指定歌曲
const playSongAt = (index) => {
  playerStore.playSong(index)
}

// 移除歌曲
const removeSong = (index) => {
  if (playlist.value.length <= 1) {
    showNotify({ type: 'warning', message: '播放列表至少保留一首歌曲' })
    return
  }
  playerStore.removeFromPlaylist(index)
}

// 清空播放列表
const clearAll = () => {
  playerStore.clearPlaylist()
  sheetVisible.value = false
}

// 总时长格式化
const totalDuration = computed(() => {
  const total = playlist.value.reduce(
    (sum, song) => sum + (song.duration || 240),
    0
  )
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`
  }
  return `${minutes} 分钟`
})
</script>

<template>
  <van-popup
    v-model:show="sheetVisible"
    position="bottom"
    :style="{ height: '75vh', borderRadius: '24px 24px 0 0' }"
    round
    closeable
    close-icon-position="top-right"
    @click-overlay="sheetVisible = false"
  >
    <div class="playlist-sheet">
      <!-- 拖拽手柄 -->
      <div class="drag-handle">
        <div class="handle-bar" />
      </div>

      <!-- 头部 -->
      <div class="sheet-header">
        <div class="header-info">
          <h2 class="header-title">当前播放列表</h2>
          <p class="header-meta">
            {{ playlist.length }} 首歌曲 · 共 {{ totalDuration }}
          </p>
        </div>
        <button class="clear-btn" @click="clearAll" v-if="playlist.length > 0">
          清空
        </button>
      </div>

      <!-- 歌曲列表 -->
      <div class="song-list" v-if="playlist.length > 0">
        <div
          v-for="(song, index) in playlist"
          :key="song.id + '-' + index"
          class="song-item"
          :class="{ active: index === currentIndex }"
          @click="playSongAt(index)"
        >
          <!-- 封面 -->
          <div class="song-cover">
            <van-image
              :src="song.cover"
              width="48"
              height="48"
              radius="12"
              fit="cover"
            />
            <!-- 播放中的动画 -->
            <div
              v-if="index === currentIndex && playerStore.isPlaying"
              class="playing-overlay"
            >
              <div class="bar" />
              <div class="bar" />
              <div class="bar" />
            </div>
          </div>

          <!-- 歌曲信息 -->
          <div class="song-info">
            <p
              class="song-title"
              :class="{ 'text-primary': index === currentIndex }"
            >
              {{ song.title }}
            </p>
            <p class="song-artist">{{ song.artist }}</p>
          </div>

          <!-- 播放中图标 -->
          <van-icon
            v-if="index === currentIndex"
            name="music-o"
            size="18"
            color="#27AE60"
            class="playing-icon"
          />

          <!-- 移除按钮 -->
          <button class="remove-btn" @click.stop="removeSong(index)">
            <van-icon name="close" size="16" />
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <van-empty description="播放列表为空" />
      </div>
    </div>
  </van-popup>
</template>

<style lang="scss" scoped>
.playlist-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

// 拖拽手柄
.drag-handle {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
  cursor: grab;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

// 头部
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px $safe-margin 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-title {
  font-size: 22px;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.header-meta {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  margin-top: 4px;
}

.clear-btn {
  background: rgba(186, 26, 26, 0.1);
  color: #ba1a1a;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: rgba(186, 26, 26, 0.2);
  }
}

// 歌曲列表
.song-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px $safe-margin 24px;

  &::-webkit-scrollbar {
    display: none;
  }
}

.song-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
  }

  &.active {
    background: rgba(39, 174, 96, 0.08);
    border: 1px solid rgba(39, 174, 96, 0.2);
    box-shadow: 0 0 12px rgba(39, 174, 96, 0.1);
  }

  &:not(.active):hover {
    background: rgba(0, 0, 0, 0.02);
  }
}

// 封面
.song-cover {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
}

.playing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(39, 174, 96, 0.2);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  padding-bottom: 8px;
  border-radius: 12px;
}

@keyframes bars {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

.bar {
  width: 3px;
  background: white;
  border-radius: 2px;
  animation: bars 0.6s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

// 歌曲信息
.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;

  &.text-primary {
    color: $primary-color;
  }
}

.song-artist {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playing-icon {
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

// 移除按钮
.remove-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    background: rgba(186, 26, 26, 0.1);
    color: #ba1a1a;
  }
}

// 空状态
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
