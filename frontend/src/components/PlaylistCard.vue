<template>
  <div class="playlist-card" @click="$emit('click')">
    <van-image :src="playlist.cover" width="100" height="100" radius="8" />
    <div class="name">{{ playlist.name }}</div>
  </div>
</template>

<script setup>
defineProps({
  playlist: Object
})
defineEmits(['click'])
</script>

<style scoped>
.playlist-card {
  flex-shrink: 0;
  width: 110px;
  text-align: center;
}
.name {
  font-size: 13px;
  margin-top: 6px;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
