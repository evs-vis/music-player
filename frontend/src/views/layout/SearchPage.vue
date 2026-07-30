<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { usePlayerStore } from '@/stores'
// import { useAuthStore } from '@/stores/auth'
// import { useFavoritesStore } from '@/stores/favorites'
import { showNotify } from 'vant'

const router = useRouter()
const playerStore = usePlayerStore()
// const authStore = useAuthStore()
// const favoritesStore = useFavoritesStore()

const searchText = ref('')
const searchResults = ref([])
const loading = ref(false)

// 模拟最近搜索（后续可接入 localStorage 持久化）
const recentSearches = ref(['周杰伦', '陈奕迅', 'Lo-fi Beats', '春日限定'])

// 模拟搜索热榜
const hotList = ref([
  { rank: 1, title: '晴天', artist: '周杰伦', album: '叶惠美', hot: true },
  { rank: 2, title: '孤勇者', artist: '陈奕迅', album: '', trend: 'up' },
  { rank: 3, title: '哪里都是你', artist: '队长', album: '' },
  { rank: 4, title: '乌梅子酱', artist: '李荣浩', album: '' },
  { rank: 5, title: '向云端', artist: '小霞 / 海洋Bo', album: '' }
])

// 推荐分类
const categories = ref([
  {
    name: '流行流行',
    gradient: 'linear-gradient(135deg, #27AE60, #006d37)',
    icon: 'music-o'
  },
  {
    name: '摇滚专区',
    gradient: 'linear-gradient(135deg, #f26d83, #a7344c)',
    icon: 'fire-o'
  },
  {
    name: '民谣之声',
    gradient: 'linear-gradient(135deg, #96f7b0, #006d38)',
    icon: 'flower-o'
  },
  {
    name: '古典雅韵',
    gradient: 'linear-gradient(135deg, #ffb2bb, #871b35)',
    icon: 'piano-o'
  }
])

// 防抖搜索（调用后端接口）
let timer = null
watch(searchText, (val) => {
  clearTimeout(timer)
  if (!val.trim()) {
    searchResults.value = []
    return
  }
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await axios.get('/api/songs', { params: { q: val.trim() } })
      searchResults.value = res.data.songs
    } catch {
      showNotify({ type: 'danger', message: '搜索失败' })
    } finally {
      loading.value = false
    }
  }, 300)
})

// 执行搜索（点击标签或输入回车）
const doSearch = async (keyword) => {
  searchText.value = keyword
  loading.value = true
  try {
    const res = await axios.get('/api/songs', { params: { q: keyword } })
    searchResults.value = res.data.songs
  } catch {
    showNotify({ type: 'danger', message: '搜索失败' })
  } finally {
    loading.value = false
  }
  // 将关键词存入最近搜索（去重前置）
  addRecentSearch(keyword)
}

const addRecentSearch = (keyword) => {
  const index = recentSearches.value.indexOf(keyword)
  if (index > -1) {
    recentSearches.value.splice(index, 1)
  }
  recentSearches.value.unshift(keyword)
  if (recentSearches.value.length > 8) recentSearches.value.pop()
}

const clearRecentSearches = () => {
  recentSearches.value = []
}

// 播放歌曲
const playSong = (song) => {
  playerStore.setPlaylist([song], 0)
  playerStore.isPlaying = true
}

// 播放热榜中的歌曲（需根据标题查歌，实际应改为通过ID）
const playHotItem = async (item) => {
  try {
    const res = await axios.get('/api/songs', { params: { q: item.title } })
    const song = res.data.songs[0]
    if (song) {
      playSong(song)
    } else {
      showNotify('歌曲未找到')
    }
  } catch {
    showNotify({ type: 'danger', message: '播放失败' })
  }
}

// 跳转分类详情（模拟按 category 过滤）
const goCategory = (catName) => {
  router.push({ name: 'PlaylistDetail', params: { category: catName } })
}
</script>

<template>
  <div class="search-page">
    <app-header></app-header>
    <!-- 搜索栏 -->
    <div class="search-bar glass-card">
      <van-icon name="search" class="search-icon" />
      <input
        v-model="searchText"
        type="text"
        class="search-input"
        placeholder="搜索歌曲、歌手"
        @keyup.enter="doSearch(searchText)"
      />
      <van-icon name="audio" class="mic-icon" />
    </div>

    <!-- 搜索结果区域（如果有输入内容） -->
    <div v-if="searchText.trim()" class="results-section">
      <div v-if="loading" class="loading-wrapper">
        <van-loading type="spinner" color="#27AE60" />
      </div>
      <div v-else-if="searchResults.length === 0" class="empty-wrapper">
        <van-empty description="没有找到相关歌曲" />
      </div>
      <div v-else class="song-list">
        <div
          v-for="song in searchResults"
          :key="song.id"
          class="song-item glass-card"
          @click="playSong(song)"
        >
          <van-image
            :src="song.cover"
            width="48"
            height="48"
            radius="8"
            fit="cover"
          />
          <div class="song-info">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-artist">{{ song.artist }}</div>
          </div>
          <van-icon name="play-circle-o" size="24" color="#27AE60" />
        </div>
      </div>
    </div>

    <!-- 默认浏览内容（未输入搜索词） -->
    <div v-else class="browse-content">
      <!-- 最近搜索 -->
      <section class="section" v-if="recentSearches.length">
        <div class="section-header">
          <h2 class="section-title">最近搜索</h2>
          <van-icon name="delete-o" size="20" @click="clearRecentSearches" />
        </div>
        <div class="tag-cloud">
          <span
            v-for="kw in recentSearches"
            :key="kw"
            class="tag"
            @click="doSearch(kw)"
            >{{ kw }}</span
          >
        </div>
      </section>

      <!-- 搜索热榜 -->
      <section class="section">
        <h2 class="section-title">搜索热榜</h2>
        <div class="hot-list glass-card">
          <div
            v-for="item in hotList"
            :key="item.rank"
            class="hot-item"
            @click="playHotItem(item)"
          >
            <span class="rank" :class="{ 'rank-top3': item.rank <= 3 }">{{
              item.rank
            }}</span>
            <div class="hot-info">
              <div class="hot-title">
                {{ item.title }}
                <span v-if="item.hot" class="badge hot-badge">HOT</span>
                <van-icon
                  v-if="item.trend === 'up'"
                  name="arrow-up"
                  class="trend-icon"
                />
              </div>
              <div class="hot-artist">
                {{ item.artist }}
                <span v-if="item.album">- {{ item.album }}</span>
              </div>
            </div>
            <van-icon
              name="play-circle-o"
              size="22"
              color="#27AE60"
              class="play-icon"
            />
          </div>
        </div>
      </section>

      <!-- 推荐分类 -->
      <section class="section">
        <h2 class="section-title">推荐分类</h2>
        <div class="category-grid">
          <div
            v-for="cat in categories"
            :key="cat.name"
            class="category-card"
            :style="{ background: cat.gradient }"
            @click="goCategory(cat.name)"
          >
            <van-icon :name="cat.icon" size="36" class="cat-icon" />
            <span class="cat-name">{{ cat.name }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-page {
  padding: 0 $safe-margin;
  margin-top: $md;
}

// 搜索栏
.search-bar {
  display: flex;
  align-items: center;
  gap: $sm;
  padding: $xs $md;
  margin: $md 0;
  border-radius: 16px;
  transition: box-shadow 0.3s;
  &:focus-within {
    box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
  }
}

.search-icon,
.mic-icon {
  font-size: 20px;
  color: $text-secondary;
}

.search-input {
  flex: 1;
  height: 44px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 500;
  color: $text-primary;
  &::placeholder {
    color: rgba($text-secondary, 0.6);
  }
}

// 通用区块
.section {
  margin-bottom: $xl;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $md;
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: $text-primary;
}

// 最近搜索标签云
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: $sm;
}
.tag {
  background: rgba(39, 174, 96, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: $primary-color;
  cursor: pointer;
  transition: background 0.2s;
  &:active {
    background: rgba(39, 174, 96, 0.15);
  }
}

// 热榜
.hot-list {
  border-radius: 16px;
  overflow: hidden;
}
.hot-item {
  display: flex;
  align-items: center;
  gap: $md;
  padding: 12px $md;
  cursor: pointer;
  transition: background 0.2s;
  &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}
.rank {
  width: 24px;
  font-size: 16px;
  font-weight: 700;
  color: rgba($text-secondary, 0.8);
  text-align: center;
}
.rank-top3 {
  color: $primary-color;
}
.hot-info {
  flex: 1;
  min-width: 0;
}
.hot-title {
  display: flex;
  align-items: center;
  gap: $xs;
  font-size: 16px;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hot-artist {
  font-size: 12px;
  color: $text-secondary;
  margin-top: 2px;
}
.badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
  color: white;
  vertical-align: middle;
}
.hot-badge {
  background: #ba1a1a;
}
.trend-icon {
  color: #ba1a1a;
  font-size: 16px;
  font-variation-settings: 'FILL' 1;
}
.play-icon {
  flex-shrink: 0;
}

// 推荐分类网格
.category-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $md;
}
.category-card {
  position: relative;
  height: 96px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: $md;
  cursor: pointer;
  transition: transform 0.3s;
  &:active {
    transform: scale(0.98);
  }
  &:hover {
    transform: scale(1.02);
  }
}
.cat-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  color: rgba(255, 255, 255, 0.2);
  font-size: 36px;
}
.cat-name {
  font-size: 18px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

// 搜索结果歌曲列表
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
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  &:active {
    background: rgba(255, 255, 255, 0.5);
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
  font-size: 12px;
  color: $text-secondary;
  margin-top: 2px;
}
.loading-wrapper,
.empty-wrapper {
  display: flex;
  justify-content: center;
  padding: $xl 0;
}
</style>
