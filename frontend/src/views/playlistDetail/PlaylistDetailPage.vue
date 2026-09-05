<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore, useFavoritesStore, useAuthStore } from '@/stores'
import { showToast } from 'vant'
import { getPlaylistsService, getSongsService } from '@/api/playlist'
import { thumbUrl } from '@/utils/image'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const favoritesStore = useFavoritesStore()
const authStore = useAuthStore()

const isPlaylistMode = computed(() => route.name === 'PlaylistDetail')
const isCategoryMode = computed(() => route.name === 'CategoryDetail')
const id = computed(() => route.params.id)

const loading = ref(false)
const playlistInfo = ref({
  name: '',
  cover: '',
  description: '',
  songs: []
})
const originalSongs = ref([]) // 原始歌曲数据

const fetchDetail = async () => {
  loading.value = true
  try {
    // 并行请求：歌单列表 + 歌曲列表
    const [playlistsRes, songsRes] = await Promise.all([getPlaylistsService(), getSongsService()])

    const allPlaylists = playlistsRes.playlists || []
    const allSongs = songsRes.songs || []
    const paramId = id.value

    // ===== 分支一：歌单模式 =====
    if (isPlaylistMode.value) {
      const matchedPlaylist = allPlaylists.find((p) => p.id === paramId)

      if (!matchedPlaylist) {
        // 歌单不存在：显示空状态，不报错
        playlistInfo.value = {
          name: '歌单不存在',
          cover: '',
          description: '请返回重新选择',
          songs: []
        }
        originalSongs.value = []
        return
      }

      // 根据歌单的 songIds 过滤出完整歌曲
      const songIds = matchedPlaylist.songIds || []
      const songs = allSongs.filter((s) => songIds.includes(s.id))

      playlistInfo.value = {
        name: matchedPlaylist.name || '未命名歌单',
        cover: matchedPlaylist.cover || '',
        description: `${songs.length} 首歌曲`,
        songs: songs
      }
      originalSongs.value = [...songs] // 浅拷贝，隔离引用
      return
    }

    // ===== 分支二：分类模式 =====
    if (isCategoryMode.value) {
      const categorySongs = allSongs.filter((s) => s.category === paramId)

      // 空分类处理
      if (categorySongs.length === 0) {
        const fallbackCover = allSongs[0]?.cover || ''
        playlistInfo.value = {
          name: '该分类暂无歌曲',
          cover: fallbackCover,
          description: '暂无歌曲，请浏览其他分类',
          songs: []
        }
        originalSongs.value = []
        return
      }

      // 取第一首歌的封面作为分类封面（如果歌本身有封面）
      const cover = categorySongs[0]?.cover || ''

      playlistInfo.value = {
        name: paramId, // 分类名称直接用英文 id，或者你可以建一个映射表转成中文
        cover: cover,
        description: `${categorySongs.length} 首歌曲`,
        songs: categorySongs
      }
      originalSongs.value = [...categorySongs] // 浅拷贝，隔离引用
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    showToast({ type: 'fail', message: '加载失败，请重试' })
  } finally {
    loading.value = false
  }
}

// 监听路由参数变化，重新加载
watch(() => route.params.id, fetchDetail, { immediate: true })

// 播放全部
const playAll = () => {
  if (originalSongs.value.length === 0) {
    showToast('没有可播放的歌曲')
    return
  }
  playerStore.playSongs(originalSongs.value, 0)
}

// 播放单曲
const playSong = (index) => {
  if (originalSongs.value.length === 0) return
  playerStore.playSongs(originalSongs.value, index)
}
// 收藏（传 song.id，与后端接口一致，PlayPage 同样传 id）
const toggleFav = async (song) => {
  if (!authStore.isLoggedIn) {
    showToast('请先登录')
    return
  }
  try {
    await favoritesStore.toggleFavorite(song.id)
  } catch {
    showToast({ type: 'fail', message: '操作失败' })
  }
}

const isFav = (id) => favoritesStore.isFavorite(id)

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="playlist-detail">
    <!-- 头部背景图 -->
    <div
      class="header-bg"
      :style="{
        backgroundImage: `url(${playlistInfo.cover || '/covers/default.webp'})`
      }"
    >
      <div class="header-overlay" />
      <div class="header-content">
        <button class="back-btn" @click="goBack">
          <van-icon name="arrow-left" size="22" color="#fff" />
        </button>
        <div class="playlist-meta">
          <h1 class="playlist-name">{{ playlistInfo.name }}</h1>
          <p class="playlist-count">{{ playlistInfo.description }}</p>
        </div>
        <button class="play-all-btn" @click="playAll">
          <van-icon name="play-circle-o" size="20" color="#fff" />
          <span>播放全部</span>
        </button>
      </div>
    </div>

    <!-- 歌曲列表 -->
    <div class="song-list-container">
      <van-loading v-if="loading" type="spinner" color="#27AE60" class="loading" />
      <van-empty v-else-if="playlistInfo.songs.length === 0" description="暂无歌曲" />
      <div v-else class="song-list">
        <div
          v-for="(song, index) in playlistInfo.songs"
          :key="song.id"
          class="song-item glass-card"
          @click="playSong(index)"
        >
          <van-image
            :src="song.coverThumb || thumbUrl(song.cover)"
            width="50"
            height="50"
            radius="8"
            fit="cover"
            class="song-cover"
            :alt="'封面：' + song.title"
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
    </div>
  </div>
</template>

<style lang="scss" scoped>
.playlist-detail {
  position: relative;
  min-height: 100vh;
  background: $bg-gradient;
}

.header-bg {
  position: relative;
  height: 260px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 0 $safe-margin $md;
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.1));
  z-index: 0;
}

.header-content {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  color: #fff;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: $safe-margin;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}

.playlist-meta {
  display: flex;
  flex-direction: column;
  gap: $xs;
}

.playlist-name {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-count {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.play-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: $primary-color;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.95);
  }
}

.song-list-container {
  padding: $md $safe-margin 0;
}

.loading {
  display: flex;
  justify-content: center;
  padding: $xl 0;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: $sm;
}

.song-item {
  display: flex;
  align-items: center;
  gap: $md;
  padding: 10px 12px;
  border-radius: 12px;
  background: $card-bg;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.6);
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
  font-size: 13px;
  color: $text-secondary;
  margin-top: 2px;
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
    transform: scale(1.2);
  }
}
</style>
