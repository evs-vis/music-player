<script setup>
import { watch } from 'vue'
const props = defineProps({
  show: Boolean,
  title: { type: String, default: '' },
  songs: { type: Array, default: () => [] },
  emptyText: { type: String, default: '暂无数据' }
})

const emit = defineEmits(['update:show', 'play'])

// 弹层显示时锁定 body 滚动
watch(
  () => props.show,
  (val) => {
    document.body.style.overflow = val ? 'hidden' : ''
  }
)

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
      <h3 class="popup-title">{{ title }}</h3>
      <div v-if="songs.length === 0" class="empty-state">
        <van-empty :description="emptyText" />
      </div>
      <div v-else class="song-list">
        <div v-for="song in songs" :key="song.id" class="song-item" @click="onPlay(song)">
          <van-image :src="song.cover" width="44" height="44" radius="8" fit="cover" />
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

.popup-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(#e7ebf0, 0.6);
  margin-bottom: $md;
  text-align: center;
  flex-shrink: 0;
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
