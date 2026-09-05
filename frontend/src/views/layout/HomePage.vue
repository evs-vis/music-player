<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore, useAuthStore, useFavoritesStore } from '@/stores'
import { getPlaylistsService, getSongsService } from '@/api/playlist'
import { showToast } from 'vant'
import { mediumUrl, thumbUrl } from '@/utils/image'
// 迷你播放器按需异步加载，避免挤占首屏同步 JS
const MiniPlayer = defineAsyncComponent(() => import('@/components/MiniPlayer.vue'))

const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
// 是否显示迷你播放器（有当前歌曲即显示）
const showMiniPlayer = computed(() => playerStore.currentSong !== null)

const playlists = ref([])
const hotSongs = ref([])
const loading = ref(true)
// 正在切换收藏的歌曲 id：切换完成前禁用该行收藏按钮，防连点对非幂等 toggle 接口造成状态错乱
const favPendingId = ref(null)

const isFav = (id) => favoritesStore.isFavorite(id)

const fetchData = async () => {
  loading.value = true
  // 歌单与歌曲两个接口并行、失败互相隔离：
  const tasks = [
    getPlaylistsService()
      .then((res) => {
        playlists.value = res.playlists || []
      })
      .catch(() => {
        showToast({ type: 'fail', message: '歌单加载失败' })
      }),
    getSongsService()
      .then((res) => {
        hotSongs.value = (res.songs || []).slice(0, 10)
      })
      .catch(() => {
        showToast({ type: 'fail', message: '歌曲加载失败' })
      })
  ]
  await Promise.all(tasks)
  loading.value = false
}

const goPlaylistDetail = (id) => {
  router.push({ name: 'PlaylistDetail', params: { id: id } })
}

const playSong = (song) => {
  playerStore.playSong(song, hotSongs.value)
}

const toggleFav = async (songId) => {
  if (!authStore.isLoggedIn) {
    showToast({ type: 'warning', message: '请先登录' })
    return
  }
  // 上一次切换未完成时忽略本次点击，避免连续点击导致收藏状态错乱
  if (favPendingId.value) return
  favPendingId.value = songId
  try {
    await favoritesStore.toggleFavorite(songId)
  } catch {
    showToast({ type: 'fail', message: '操作失败' })
  } finally {
    favPendingId.value = null
  }
}

onMounted(() => {
  fetchData()
  favoritesStore.loadFavorites()
})
</script>

<template>
  <div class="home-page">
    <app-header />

    <!-- 推荐歌单 -->
    <section class="section">
      <h2 class="section-title">推荐歌单</h2>
      <div class="scroll-container no-scrollbar">
        <!-- 歌单卡骨架占位 -->
        <template v-if="loading">
          <div v-for="i in 2" :key="'skc' + i" class="playlist-card playlist-skeleton"></div>
        </template>
        <template v-else>
          <div
            v-for="pl in playlists"
            :key="pl.id"
            class="playlist-card glass-card"
            @click="goPlaylistDetail(pl.id)"
          >
            <div
              class="card-bg"
              :style="{ backgroundImage: `url(${pl.coverMedium || mediumUrl(pl.cover)})` }"
            />
            <div class="card-overlay" />
            <span class="card-name">{{ pl.name }}</span>
          </div>
        </template>
      </div>
    </section>

    <!-- 热门歌曲 -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">热门歌曲</h2>
        <span class="more-btn" @click="router.push('/search')">查看更多</span>
      </div>
      <div class="song-list">
        <!-- 未到前的骨架 -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'sk' + i" class="song-item song-skeleton">
            <div class="skeleton-cover"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(song, idx) in hotSongs"
            :key="song.id"
            class="song-item glass-card"
            @click="playSong(song, idx)"
          >
            <van-image
              :src="song.coverThumb || thumbUrl(song.cover)"
              width="56"
              height="56"
              radius="8"
              fit="cover"
              class="song-cover"
              :loading="idx < 3 ? 'eager' : 'lazy'"
              :fetchpriority="idx < 3 ? 'high' : 'auto'"
              :alt="'封面：' + song.title"
            />
            <div class="song-info">
              <div class="song-title">{{ song.title }}</div>
              <div class="song-artist">{{ song.artist }}</div>
            </div>
            <button
              class="fav-btn"
              @click.stop="toggleFav(song.id)"
              :aria-label="isFav(song.id) ? '取消收藏' : '收藏'"
              :disabled="favPendingId === song.id"
            >
              <van-icon
                :name="isFav(song.id) ? 'like' : 'like-o'"
                :color="isFav(song.id) ? '#E74C3C' : '#BCCABC'"
                size="20"
              />
            </button>
          </div>
        </template>
      </div>
    </section>

    <!-- ✅ 迷你播放器（内部自带播放列表弹层，点击整卡由组件内部跳转播放页） -->
    <MiniPlayer v-if="showMiniPlayer" />
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

/* 歌单卡骨架占位：撑住 176x224 高度，数据到达时原位替换，避免 CLS */
.playlist-skeleton {
  display: flex;
  background: linear-gradient(145deg, rgba(39, 174, 96, 0.14), rgba(39, 174, 96, 0.05));
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

/* 热门歌曲骨架行 */
.song-skeleton {
  min-height: 72px;
  pointer-events: none;
}

.skeleton-cover {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: rgba(39, 174, 96, 0.12);
}

.skeleton-lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.skeleton-line {
  height: 14px;
  width: 60%;
  border-radius: 4px;
  background: rgba(39, 174, 96, 0.12);

  &.short {
    width: 40%;
    height: 12px;
  }
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
  &:disabled {
    opacity: 0.5;
    transform: none;
    cursor: default;
  }
}
</style>
