<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore, useAuthStore, useHistoryStore } from '@/stores'
import { getPlaylistsService, getSongsService } from '@/api/playlist'
import { getFavoriteService, updateFavoriteService } from '@/api/favorite'
import { showToast } from 'vant'
import MiniPlayer from '@/components/MiniPlayer.vue'
import PlaylistSheet from '@/components/PlaylistSheet.vue'

const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const historyStore = useHistoryStore()
// ✅ 播放列表弹层
const showPlaylist = ref(false)

// ✅ 是否显示迷你播放器
const showMiniPlayer = computed(() => playerStore.currentSong !== null)

const playlists = ref([])
const hotSongs = ref([])
const favoriteIds = ref([])

const fetchData = async () => {
  try {
    const [plRes, songRes] = await Promise.all([getPlaylistsService(), getSongsService()])
    playlists.value = plRes.playlists
    hotSongs.value = songRes.songs.slice(0, 10)
  } catch {
    showToast({ type: 'fail', message: '数据加载失败' })
  }
}

const goPlaylistDetail = (id) => {
  router.push({ name: 'PlaylistDetail', params: { category: id } })
}

const playSong = (song) => {
  playerStore.playSong(song, hotSongs.value)
  if (authStore.isLoggedIn) {
    historyStore.addToHistory(song.id)
  }
}

const refreshFavorites = async () => {
  if (!authStore.isLoggedIn) {
    favoriteIds.value = []
    return
  }
  try {
    const res = await getFavoriteService()
    favoriteIds.value = (res.favorites || []).map((song) => song.id)
  } catch {
    favoriteIds.value = []
  }
}

const toggleFav = async (song) => {
  if (!authStore.isLoggedIn) {
    showToast({ type: 'warning', message: '请先登录' })
    return
  }
  try {
    await updateFavoriteService(song.id)
    await refreshFavorites()
  } catch {
    showToast({ type: 'fail', message: '操作失败' })
  }
}

const isFav = (id) => favoriteIds.value.includes(id)

onMounted(() => {
  fetchData()
  refreshFavorites()
})
</script>

<template>
  <div class="home-page">
    <app-header></app-header>

    <!-- 推荐歌单 -->
    <section class="section">
      <h2 class="section-title">推荐歌单</h2>
      <div class="scroll-container no-scrollbar">
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="playlist-card glass-card"
          @click="goPlaylistDetail(pl.id)"
        >
          <div class="card-bg" :style="{ backgroundImage: `url(${pl.cover})` }" />
          <div class="card-overlay" />
          <span class="card-name">{{ pl.name }}</span>
        </div>
      </div>
    </section>

    <!-- 热门歌曲 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">热门歌曲</h2>
        <span class="more-btn" @click="router.push('/search')">查看更多</span>
      </div>
      <div class="song-list">
        <div
          v-for="(song, idx) in hotSongs"
          :key="song.id"
          class="song-item glass-card"
          @click="playSong(song, idx)"
        >
          <van-image
            :src="song.cover"
            width="56"
            height="56"
            radius="8"
            fit="cover"
            class="song-cover"
          />
          <div class="song-info">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-artist">{{ song.artist }}</div>
          </div>
          <button class="fav-btn" @click.stop="toggleFav(song)">
            <van-icon
              :name="isFav(song.id) ? 'like' : 'like-o'"
              :color="isFav(song.id) ? '#E74C3C' : '#BCCABC'"
              size="20"
            />
          </button>
        </div>
      </div>
    </section>

    <!-- ✅ 迷你播放器 -->
    <MiniPlayer
      v-if="showMiniPlayer"
      @click="router.push('/play')"
      @show-playlist="showPlaylist = true"
    />

    <!-- ✅ 播放列表弹层 -->
    <PlaylistSheet v-model:show="showPlaylist" />
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  padding: 0 $safe-margin;
  margin-top: $md;
}

.section {
  margin-bottom: $xl;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: $md;
  color: $text-primary;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: $md;
}

.more-btn {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $primary-color;
}

/* 水平滚动 */
.scroll-container {
  display: flex;
  gap: $md;
  overflow-x: auto;
  padding-bottom: $sm;
  -webkit-overflow-scrolling: touch;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* 歌单卡片 */
.playlist-card {
  flex-shrink: 0;
  width: 176px; /* 44 * 4 = 176px，转换后约 46.93vw */
  height: 224px;
  border-radius: $card-radius;
  position: relative;
  overflow: hidden;
  box-shadow: $card-shadow;
  transition: transform 0.2s;
  &:active {
    transform: scale(0.95);
  }
}

.card-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.card-name {
  position: absolute;
  top: $sm;
  left: $sm;
  font-size: 12px;
  font-weight: 600;
  color: white;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  border-radius: $card-radius;
}

/* 歌曲列表项 */
.song-list {
  display: flex;
  flex-direction: column;
  gap: $sm;
}

.song-item {
  display: flex;
  align-items: center;
  gap: $md;
  padding: $sm;
  border-radius: $card-radius;
  transition: all 0.2s;
  cursor: pointer;
  &:active {
    transform: scale(0.98);
    background: rgba(39, 174, 96, 0.1);
  }
}

.song-cover {
  flex-shrink: 0;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 16px;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 14px;
  color: $text-secondary;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
  &:active {
    transform: scale(1.25);
  }
}
</style>
