<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore, useAuthStore, useSearchHistoryStore } from '@/stores'
import { showToast } from 'vant'
import { getSongsService } from '@/api/playlist'
import { useDebounceFn } from '@vueuse/core'
import { CATEGORIES } from '@/constants/categories'
import { thumbUrl } from '@/utils/image'
const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const searchHistoryStore = useSearchHistoryStore()

const searchText = ref('')
const searchResults = ref([])
const loading = ref(false)
onMounted(() => {
  if (authStore.isLoggedIn) {
    searchHistoryStore.loadHistory()
  }
})

// 模拟搜索热榜
const hotList = ref([
  { rank: 1, title: '晴天', artist: '周杰伦', album: '叶惠美', hot: true },
  { rank: 2, title: '孤勇者', artist: '陈奕迅', album: '', trend: 'up' },
  { rank: 3, title: '哪里都是你', artist: '队长', album: '' },
  { rank: 4, title: '乌梅子酱', artist: '李荣浩', album: '' },
  { rank: 5, title: '向云端', artist: '小霞 / 海洋Bo', album: '' }
])

// 推荐分类（身份数据来自共享常量；gradient 为卡片渐变，仅本页展示的分类定义）
const categoryGradients = {
  pop: 'linear-gradient(135deg, #27AE60, #006d37)',
  rock: 'linear-gradient(135deg, #f26d83, #a7344c)',
  classical: 'linear-gradient(135deg, #96f7b0, #006d38)',
  jazz: 'linear-gradient(135deg, #ffb2bb, #871b35)'
}
const categories = CATEGORIES.filter((c) => categoryGradients[c.id]).map((c) => ({
  ...c,
  gradient: categoryGradients[c.id]
}))

// ---------- 核心搜索函数 ----------
const performSearch = async (keyword) => {
  const trimmed = keyword.trim()
  if (!trimmed) {
    searchResults.value = []
    return
  }

  loading.value = true
  try {
    const res = await getSongsService({ q: trimmed })
    searchResults.value = res.songs
    // 登录用户记录搜索历史
    if (authStore.isLoggedIn) {
      searchHistoryStore.addHistory(trimmed)
    }
  } catch {
    showToast({ type: 'fail', message: '搜索失败' })
    searchResults.value = []
  } finally {
    loading.value = false
  }
}
// 防抖搜索（输入框）：使用 VueUse 的 useDebounceFn，提供 cancel 方法，卸载时取消待执行任务
const debouncedSearch = useDebounceFn((val) => {
  performSearch(val)
}, 300)

// 手动触发标志，用于阻止 watch 重复触发防抖
let isManualTrigger = false

// 监听输入变化
watch(searchText, (val) => {
  // 如果是手动触发的搜索（点击标签/回车），则跳过本次 watch
  if (isManualTrigger) {
    isManualTrigger = false // 重置标志，恢复后续正常防抖
    return
  }

  // 空值处理
  if (!val.trim()) {
    searchResults.value = []
    return
  }

  // 触发防抖搜索
  debouncedSearch(val)
})

// 手动搜索（标签点击或回车）：取消待执行防抖后立即搜索
const doSearch = async (keyword) => {
  // 取消正在等待的防抖任务，避免重复
  debouncedSearch.cancel()

  // 设置标志，告诉 watch 本次变化是手动触发的，不要防抖
  isManualTrigger = true

  // 更新输入框内容（会触发 watch，但被标志拦截）
  searchText.value = keyword

  // 立即执行搜索（不防抖）
  await performSearch(keyword)
}
const clearHistorySearches = async () => {
  loading.value = true
  try {
    await searchHistoryStore.clearHistory()
    showToast('已清空搜索历史')
  } catch {
    showToast({ type: 'fail', message: '清空失败，请重试' })
  } finally {
    loading.value = false
  }
}
// 播放歌曲
const playSong = (song) => {
  playerStore.playSongs([song], 0)
}
// 添加到播放列表
const addToPlaylist = (song) => {
  playerStore.addToPlaylist(song)
  showToast('已添加到播放列表')
}
// 播放热榜中的歌曲：按标题精确搜索后取第一首播放
const playHotItem = async (item) => {
  try {
    const res = await getSongsService({ q: item.title })
    const song = res.songs[0]
    if (song) {
      playSong(song)
    } else {
      showToast('歌曲未找到')
    }
  } catch {
    showToast({ type: 'fail', message: '播放失败' })
  }
}

// 跳转分类详情（传英文分类 id，详情页按 category 字段匹配）
const goCategory = (cat) => {
  router.push({ name: 'PlaylistDetail', params: { category: cat.id } })
}

// 卸载时取消待执行的防抖任务，避免切页后仍发无意义请求
onUnmounted(() => {
  debouncedSearch.cancel()
})
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
          <button class="add-btn" @click.stop="addToPlaylist(song)">
            <van-icon name="add-o" size="20" color="#27ae60" />
          </button>
          <van-image
            :src="song.coverThumb || thumbUrl(song.cover)"
            width="48"
            height="48"
            radius="8"
            fit="cover"
            :alt="'封面：' + song.title"
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
      <section class="section" v-if="searchHistoryStore.searchHistory.length">
        <div class="section-header">
          <h2 class="section-title">最近搜索</h2>
          <van-icon name="delete-o" size="20" @click="clearHistorySearches" />
        </div>
        <div class="tag-cloud">
          <span
            v-for="kw in searchHistoryStore.searchHistory"
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
          <div v-for="item in hotList" :key="item.rank" class="hot-item" @click="playHotItem(item)">
            <span class="rank" :class="{ 'rank-top3': item.rank <= 3 }">{{ item.rank }}</span>
            <div class="hot-info">
              <div class="hot-title">
                {{ item.title }}
                <span v-if="item.hot" class="badge hot-badge">HOT</span>
                <van-icon v-if="item.trend === 'up'" name="arrow-up" class="trend-icon" />
              </div>
              <div class="hot-artist">
                {{ item.artist }}
                <span v-if="item.album">- {{ item.album }}</span>
              </div>
            </div>
            <van-icon name="play-circle-o" size="22" color="#27AE60" class="play-icon" />
          </div>
        </div>
      </section>

      <!-- 推荐分类 -->
      <section class="section">
        <h2 class="section-title">推荐分类</h2>
        <div class="category-grid">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-card"
            :style="{ background: cat.gradient }"
            @click="goCategory(cat)"
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
.add-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #27ae60;
  background: rgba(39, 174, 96, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:active {
    background: rgba(39, 174, 96, 0.2);
  }
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
