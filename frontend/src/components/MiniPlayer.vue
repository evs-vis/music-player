<script setup>
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores'
import { useRouter } from 'vue-router'
defineEmits(['click', 'showPlaylist'])
const playerStore = usePlayerStore()
const router = useRouter()
const showPlaylist = ref(false)
const progressPercent = computed(() => {
  if (!playerStore.duration) return 0
  return (playerStore.currentTime / playerStore.duration) * 100
})

const playIcon = computed(() => (playerStore.isPlaying ? 'pause' : 'play'))

const goPlayPage = () => {
  router.push('/play')
}

// 通过 useAudio 驱动的进度会由 playerStore 更新，这里只需要同步即可
// 迷你播放器不直接控制音频，仅展示
</script>

<template>
  <div v-if="playerStore.currentSong" class="mini-player glass-card" @click="goPlayPage">
    <van-image
      :src="playerStore.currentSong.cover"
      width="48"
      height="48"
      radius="8"
      fit="cover"
      class="cover"
    />
    <div class="info">
      <div class="title">{{ playerStore.currentSong.title }}</div>
      <div class="artist">{{ playerStore.currentSong.artist }}</div>
    </div>
    <div class="controls">
      <button class="prev-btn" @click.stop="playerStore.playPrev()">
        <van-icon name="arrow-left" size="28" />
      </button>
      <button class="play-btn" @click.stop="playerStore.togglePlay()">
        <van-icon :name="playIcon" size="28" :class="playIcon" />
      </button>
      <button class="next-btn" @click.stop="playerStore.playNext()">
        <van-icon name="arrow" size="28" />
      </button>
      <button class="list-btn" @click.stop="showPlaylist = true">
        <van-icon name="music-o" size="20" />
      </button>
    </div>
    <!-- 进度条 -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
    </div>
  </div>
  <!-- 播放列表弹出层 -->
  <playlist-sheet v-model:show="showPlaylist" />
</template>

<style lang="scss" scoped>
.mini-player {
  position: fixed;
  bottom: calc($tabbar-height + $sm);
  left: $safe-margin;
  right: $safe-margin;
  z-index: 50;
  border-radius: $card-radius;
  padding: $sm;
  display: flex;
  align-items: center;
  gap: $md;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.7); /* 半透明白 */
  backdrop-filter: blur(12px);

  .cover {
    flex-shrink: 0;
    border-radius: 8px;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 16px;
    font-weight: 500;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .artist {
    font-size: 14px;
    color: $text-secondary;
  }

  .controls {
    display: flex;
    gap: $xs;
    align-items: center;

    button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: $primary-color;
      transition: transform 0.2s;
      &:active {
        transform: scale(0.9);
      }
    }
    .play-btn {
      background: rgba(39, 174, 96, 0.3);
    }
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(39, 174, 96, 0.5);
    border-radius: 0 0 $card-radius $card-radius;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: $primary-color;
    transition: width 1s linear;
  }
}
</style>
