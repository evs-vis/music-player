<script setup>
import { thumbUrl } from '@/utils/image'
defineProps({
  show: Boolean,
  title: { type: String, default: '' },
  songs: { type: Array, default: () => [] },
  emptyText: { type: String, default: '暂无数据' },
  // 是否展示「清空」按钮（父组件监听 @clear 事件，如清空播放历史）
  clearable: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'play', 'clear'])

// 弹层滚动锁定由 Vant popup 自带 lockScroll 处理，无需手写 body overflow
const close = () => emit('update:show', false)
const onPlay = (song) => emit('play', song)
</script>

<template>
  <van-popup
    :show="show"
    @update:show="emit('update:show', $event)"
    position="bottom"
    :style="{ height: '60vh', borderRadius: '24px 24px 0 0' }"
    round
    closeable
    @click-close-icon="close"
  >
    <div class="popup-container">
      <div class="popup-header">
        <h3 class="popup-title">{{ title }}</h3>
        <button v-if="clearable && songs.length" class="clear-btn" @click="emit('clear')">
          清空
        </button>
      </div>
      <div v-if="songs.length === 0" class="empty-state">
        <van-empty :description="emptyText" />
      </div>
      <div v-else class="song-list">
        <div v-for="song in songs" :key="song.id" class="song-item" @click="onPlay(song)">
          <van-image
            :src="song.coverThumb || thumbUrl(song.cover)"
            width="44"
            height="44"
            radius="8"
            fit="cover"
            :alt="'封面：' + song.title"
          />
          <div class="song-info">
            <span class="song-title">{{ song.title }}</span>
            <span class="song-artist">{{ song.artist }}</span>
          </div>
          <van-icon name="play-circle-o" size="20" color="#27AE60" />
        </div>
      </div>
    </div>
  </van-popup>
</template>

<style lang="scss" scoped>
.popup-container {
  padding: $md $safe-margin;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $md;
  flex-shrink: 0;
}

.popup-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(#e7ebf0, 0.6);
  text-align: center;
}

.clear-btn {
  background: rgba(186, 26, 26, 0.1);
  color: #ba1a1a;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: rgba(186, 26, 26, 0.2);
  }
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $sm;
  overscroll-behavior: contain;
  touch-action: pan-y;
  padding-bottom: $safe-margin;

  &::-webkit-scrollbar {
    display: none;
  }
}

.song-item {
  display: flex;
  align-items: center;
  gap: $md;
  padding: $sm $lg;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: rgba(0, 0, 0, 0.03);
  }
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(#ffffff, 0.9);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  color: $text-secondary;
  margin-top: 2px;
}
</style>
