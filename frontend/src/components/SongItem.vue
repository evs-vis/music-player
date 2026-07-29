<template>
  <div class="song-item" @click="$emit('click')">
    <van-image :src="song.cover" width="50" height="50" radius="5" />
    <div class="song-info">
      <div class="title">{{ song.title }}</div>
      <div class="artist">{{ song.artist }}</div>
    </div>
    <div class="actions">
      <van-icon
        :name="isFavorite ? 'like' : 'like-o'"
        :color="isFavorite ? '#e60026' : '#999'"
        @click.stop="$emit('toggle-favorite', song)"
      />
      <van-icon name="add-o" @click.stop="$emit('add-to-playlist', song)" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  song: Object,
  isFavorite: Boolean
})
defineEmits(['click', 'toggle-favorite', 'add-to-playlist'])
</script>

<style scoped>
.song-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;
}
.song-info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}
.title {
  font-size: 15px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.artist {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.actions {
  display: flex;
  gap: 12px;
  font-size: 18px;
}
</style>
