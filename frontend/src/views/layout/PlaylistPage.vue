<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPlaylistsService, getSongsService } from '@/api/playlist'
import { usePlayerStore } from '@/stores'
import { showToast } from 'vant'
import { CATEGORIES } from '@/constants/categories'
import { thumbUrl } from '@/utils/image'

const router = useRouter()
const playerStore = usePlayerStore()

// 分类列表（id/name/icon 来自共享常量；color 为分类卡片配色）
const categoryColors = {
  pop: '#27AE60',
  rock: '#a7344c',
  jazz: '#006d38',
  classical: '#005228',
  electronic: '#27AE60',
  hiphop: '#005228',
  rnb: '#ba1a1a',
  ambient: '#7F8C8D'
}
const categories = CATEGORIES.map((c) => ({ ...c, color: categoryColors[c.id] }))

// 推荐歌单
const featuredPlaylist = ref(null)
const loading = ref(false)

const fetchFeatured = async () => {
  loading.value = true
  try {
    const res = await getPlaylistsService()
    // 取第一个歌单作为推荐
    if (res.playlists.length > 0) {
      featuredPlaylist.value = res.playlists[0]
    }
  } catch {
    showToast({ type: 'fail', message: '获取失败' })
  } finally {
    loading.value = false
  }
}

// 跳转分类详情页（传英文分类 id，详情页按 id 匹配）
const goCategory = (cat) => {
  router.push({ name: 'CategoryDetail', params: { id: cat.id } })
}

const goPlaylistDetail = (id) => {
  router.push({ name: 'PlaylistDetail', params: { id: id } })
}

// 播放推荐歌单的所有歌曲
const playFeaturedPlaylist = async () => {
  if (!featuredPlaylist.value) return
  try {
    const res = await getSongsService()
    const allSongs = res.songs
    const playlistSongs = (featuredPlaylist.value.songIds || [])
      .map((id) => allSongs.find((s) => s.id === id))
      .filter(Boolean)
    if (playlistSongs.length > 0) {
      playerStore.playSongs(playlistSongs, 0)
    }
  } catch {
    showToast({ type: 'fail', message: '播放失败' })
  }
}

onMounted(() => {
  fetchFeatured()
})
</script>

<template>
  <div class="category-page">
    <app-header></app-header>
    <!-- 标题区域 -->
    <section class="header-section">
      <h2 class="page-title">分类探索</h2>
      <p class="page-subtitle">发现你最喜爱的音乐风格</p>
    </section>

    <!-- 分类网格 -->
    <div class="category-grid">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-card glass-card"
        @click="goCategory(cat)"
      >
        <div class="icon-wrapper" :style="{ backgroundColor: cat.color + '10', color: cat.color }">
          <span class="svg-icon" v-html="cat.icon"></span>
        </div>
        <span class="cat-name" :style="{ color: cat.color }">{{ cat.name }}</span>
      </div>
    </div>

    <!-- 推荐歌单 -->
    <section class="featured-section" v-if="featuredPlaylist">
      <h3 class="section-title">为您推荐</h3>
      <div class="featured-card glass-card" @click="goPlaylistDetail(featuredPlaylist.id)">
        <div class="cover-wrapper">
          <van-image
            :src="featuredPlaylist.coverThumb || thumbUrl(featuredPlaylist.cover)"
            width="80"
            height="80"
            radius="8"
            fit="cover"
            :alt="'封面：' + featuredPlaylist.name"
          />
        </div>
        <div class="playlist-info">
          <h4 class="playlist-name">{{ featuredPlaylist.name }}</h4>
          <p class="song-count">{{ featuredPlaylist.songIds?.length || 0 }} 首歌曲</p>
        </div>
        <button class="play-btn" @click.stop="playFeaturedPlaylist">
          <van-icon name="play" size="20" color="#fff" />
        </button>
      </div>
    </section>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <van-loading type="spinner" color="#27AE60" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.category-page {
  padding: 0 $safe-margin;
  margin-top: $md;
}

.header-section {
  margin-bottom: $lg;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $xs;
}

.page-subtitle {
  font-size: 14px;
  color: rgba($text-secondary, 0.7);
}

// 分类网格
.category-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $gutter;
  margin-bottom: $xl;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $md;
  padding: $lg;
  border-radius: 16px;
  aspect-ratio: 1;
  transition: all 0.3s;
  cursor: pointer;

  &:active {
    transform: scale(0.96);
  }
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cat-name {
  font-size: 18px;
  font-weight: 700;
}

.svg-icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  color: inherit;
  svg {
    width: 100%;
    height: 100%;
    display: block;
    stroke: currentColor;
  }
}
// 推荐歌单
.featured-section {
  margin-top: $xl;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $md;
}

.featured-card {
  display: flex;
  align-items: center;
  gap: $md;
  padding: $md;
  border-radius: 16px;
  transition: all 0.3s;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.cover-wrapper {
  flex-shrink: 0;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-name {
  font-size: 16px;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-count {
  font-size: 14px;
  color: $text-secondary;
  margin-top: 4px;
}

.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: $primary-color;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;

  &:active {
    transform: scale(0.9);
  }
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: $xl 0;
}
</style>
