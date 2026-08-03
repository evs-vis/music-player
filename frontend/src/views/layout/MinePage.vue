<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, usePlayerStore, useFavoritesStore, useHistoryStore } from '@/stores'
import defaultAvatar from '@/assets/avatar.jpg'
import { uploadAvatarService } from '@/api/auth'
import { showToast, showNotify, showConfirmDialog } from 'vant'

import SongListPopup from '@/components/SongListPopup.vue'

const router = useRouter()
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const historyStore = useHistoryStore()
const playerStore = usePlayerStore()
const fileInput = ref(null)
const showSettings = ref(false)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const username = computed(() => authStore.user?.username || '音乐爱好者')

// 收藏歌曲数量
const favCount = computed(() => favoritesStore.favoriteSongs.length)

// 最近播放（取前6首）
const recentPlays = computed(() => historyStore.historyList.slice(0, 6))

// 播放歌曲
const playSong = (song) => {
  playerStore.setPlaylist([song], 0)
  playerStore.isPlaying = true
}

// 跳转登录
const goLogin = () => {
  router.push('/login')
}

// 跳转到收藏列表
const goFavorites = () => {
  if (!isLoggedIn.value) {
    goLogin()
    return
  }
  // 可以跳转到一个专门的收藏列表页，这里简单处理
  showFavorites.value = !showFavorites.value
}

const goHistory = () => {
  if (!isLoggedIn.value) {
    goLogin()
    return
  }
  // 可以跳转到一个专门的收藏列表页，这里简单处理
  showHistory.value = !showHistory.value
}
// 点击播放
const playFromPopup = (song) => {
  playerStore.setPlaylist([song], 0)
  playerStore.isPlaying = true
  // 关闭弹层
  showFavorites.value = false
  showHistory.value = false
}
const showFavorites = ref(false)
const showHistory = ref(false)
// 注销账号（#39）：二次确认后删除账号并跳转登录页
const deleteAccount = async () => {
  try {
    await showConfirmDialog({
      title: '注销账号',
      message: '确定要注销账号吗？注销后账号及收藏、播放记录将被永久删除，且无法恢复。',
      confirmButtonText: '确认注销',
      confirmButtonColor: '#e74c3c'
    })
  } catch {
    return // 用户取消
  }
  try {
    await authStore.deleteAccount()
    showToast({ type: 'success', message: '账号已注销' })
    router.replace('/login')
  } catch (error) {
    const msg = error?.response?.data?.error || '注销失败，请重试'
    showToast({ type: 'fail', message: msg })
  }
}
// 设置菜单项
const menuItems = [
  { icon: 'envelope-o', label: '消息中心', badge: 3, action: () => {} },
  {
    icon: 'setting-o',
    label: '设置',
    action: () => {
      showSettings.value = true
    }
  },
  { icon: 'question-o', label: '帮助与反馈', action: () => {} },
  { icon: 'delete-o', label: '注销账号', danger: true, action: deleteAccount }
]
// 头像地址
const avatarSrc = computed(() => {
  const customAvatar = authStore.user?.avatar
  if (customAvatar) {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    return baseURL + customAvatar
  }
  return defaultAvatar
})
// 点击头像触发文件选择
const updatePic = () => {
  if (!isLoggedIn.value) return
  fileInput.value?.click()
}
// 选择文件后上传
const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 校验文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    showNotify({ type: 'warning', message: '图片不能超过2MB' })
    return
  }

  try {
    showToast({ message: '上传中...', duration: 0, forbidClick: true })
    const res = await uploadAvatarService(file)
    // 更新 store 中的头像路径
    authStore.user.avatar = res.avatar
    showToast({ message: '头像更新成功', icon: 'success' })
  } catch (error) {
    console.error(error)
    showNotify({
      type: 'danger',
      message: '上传失败，请重试|}'
    })
  } finally {
    // 清除 input 值，以便重复上传同一文件
    event.target.value = ''
  }
}
onMounted(() => {
  if (isLoggedIn.value) {
    favoritesStore.loadFavorites()
    historyStore.loadHistory()
  }
})
</script>

<template>
  <div class="mine-page">
    <header class="top-bar">
      <div class="logo-area">
        <span class="icon graphic_eq">♪</span>
        <span class="brand-name">Music Player</span>
      </div>
    </header>
    <!-- 未登录引导 -->
    <div v-if="!isLoggedIn" class="login-section">
      <div class="login-card glass-card">
        <van-image
          :src="avatarSrc"
          width="80"
          height="80"
          round
          fit="cover"
          class="default-avatar"
        />
        <p class="login-text">登录后享受个性化推荐</p>
        <van-button round type="primary" block @click="goLogin" class="login-btn">
          立即登录
        </van-button>
      </div>
    </div>

    <!-- 已登录内容 -->
    <template v-else>
      <!-- 个人信息 -->
      <section class="profile-section">
        <div class="profile-card glass-card" @click="updatePic">
          <div class="avatar-wrapper">
            <van-image :src="avatarSrc" width="72" height="72" round fit="cover" class="avatar" />
            <div class="edit-badge">
              <van-icon name="edit" size="14" color="#fff" />
            </div>
          </div>
          <h2 class="username">{{ username }}</h2>
          <p class="bio">让音乐点亮生活的每一个角落 🎵</p>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileChange"
        />
      </section>

      <!-- 统计数据 -->
      <section class="stats-section">
        <div class="stats-card glass-card">
          <div class="stat-item">
            <span class="stat-value">128</span>
            <span class="stat-label">关注</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">2.4k</span>
            <span class="stat-label">粉丝</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">42</span>
            <span class="stat-label">歌单</span>
          </div>
        </div>
      </section>

      <!-- 最近播放 -->
      <section class="recent-section" v-if="recentPlays.length">
        <div class="section-header">
          <h3 class="section-title">最近播放</h3>
          <span class="section-more" @click="goHistory">查看全部</span>
        </div>
        <div class="recent-scroll">
          <div
            v-for="song in recentPlays"
            :key="song.id"
            class="recent-item"
            @click="playSong(song)"
          >
            <div class="recent-cover">
              <van-image :src="song.cover" width="100%" height="100%" fit="cover" radius="8px" />
              <div class="play-overlay">
                <van-icon name="play-circle-o" size="24" color="#fff" />
              </div>
            </div>
            <p class="recent-title">{{ song.title }}</p>
            <p class="recent-artist">{{ song.artist }}</p>
          </div>
        </div>
      </section>

      <!-- 功能入口网格 -->
      <section class="bento-section">
        <div class="bento-grid">
          <div class="bento-item wide glass-card" @click="goFavorites">
            <div class="bento-icon-wrapper">
              <van-icon name="like-o" size="24" color="#27AE60" />
            </div>
            <div class="bento-info">
              <span class="bento-title">我喜欢的音乐</span>
              <span class="bento-count">{{ favCount }} 首歌曲</span>
            </div>
            <van-icon name="arrow" size="16" color="#BCCABC" />
          </div>
          <div class="bento-item glass-card">
            <div class="bento-icon-wrapper">
              <van-icon name="down" size="24" color="#006d38" />
            </div>
            <span class="bento-title">本地下载</span>
            <span class="bento-count">12 专辑</span>
          </div>
          <div class="bento-item glass-card">
            <div class="bento-icon-wrapper">
              <van-icon name="shopping-cart-o" size="24" color="#a7344c" />
            </div>
            <span class="bento-title">已购内容</span>
            <span class="bento-count">3 记录</span>
          </div>
        </div>
      </section>

      <!-- 设置菜单 -->
      <section class="menu-section">
        <div class="menu-card glass-card">
          <van-cell
            v-for="item in menuItems"
            :key="item.label"
            :title="item.label"
            :icon="item.icon"
            is-link
            :class="{ 'danger-cell': item.danger }"
            @click="item.action"
          >
            <template v-if="item.badge" #right-icon>
              <van-badge :content="item.badge" />
            </template>
          </van-cell>
        </div>
      </section>
    </template>

    <!-- 收藏歌曲弹层（简单展示） -->
    <SongListPopup
      v-model:show="showFavorites"
      title="我喜欢的音乐"
      :songs="favoritesStore.favoriteSongs"
      empty-text="还没有收藏歌曲"
      @play="playFromPopup"
    />
    <!-- 历史记录弹层（简单展示） -->
    <SongListPopup
      v-model:show="showHistory"
      title="最近播放"
      :songs="historyStore.historyList"
      empty-text="还没有播放记录"
      @play="playFromPopup"
    />
  </div>
  <settings-drawer v-model:show="showSettings"></settings-drawer>
</template>

<style lang="scss" scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $md 0;
  z-index: 10;
  .logo-area {
    display: flex;
    align-items: center;
    gap: $xs;
  }
  .icon.graphic_eq {
    margin-right: $xs;
    font-size: 30px;
    color: $primary-color;
    font-weight: bold;
  }
  .brand-name {
    font-size: 24px;
    font-weight: 800;
    color: $primary-color;
    letter-spacing: -0.02em;
  }
}

.mine-page {
  padding: 0 $safe-margin;
  margin-top: $md;
  padding-bottom: $xl;
}

// 未登录
.login-section {
  display: flex;
  justify-content: center;
  padding-top: $xl;
}

.login-card {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $xl;
  border-radius: 16px;
  text-align: center;
}

.default-avatar {
  border: 4px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: $md;
}

.login-text {
  font-size: 15px;
  color: $text-secondary;
  margin-bottom: $lg;
}

.login-btn {
  width: 100%;
}

// 个人信息
.profile-section {
  margin-top: $lg;
}

.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $xl $lg;
  border-radius: 16px;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: $md;
}

.avatar {
  border: 4px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: $primary-color;
  padding: 4px;
  border-radius: 50%;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.username {
  font-size: 22px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 $xs;
}

.bio {
  font-size: 13px;
  color: rgba($text-secondary, 0.7);
  margin: 0;
}

// 统计数据
.stats-section {
  margin-top: $md;
}

.stats-card {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: $lg 0;
  border-radius: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid rgba($text-secondary, 0.1);

  &:last-child {
    border-right: none;
  }
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: $primary-color;
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba($text-secondary, 0.6);
}

// 最近播放
.recent-section {
  margin-top: $lg;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $md;
  padding: 0 $xs;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: $text-primary;
}

.section-more {
  font-size: 12px;
  font-weight: 600;
  color: $primary-color;
  cursor: pointer;
}

.recent-scroll {
  display: flex;
  gap: $md;
  overflow-x: auto;
  padding-bottom: $sm;

  &::-webkit-scrollbar {
    display: none;
  }
}

.recent-item {
  flex-shrink: 0;
  width: 120px;
  cursor: pointer;

  &:active {
    transform: scale(0.96);
  }
}

.recent-cover {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: $xs;
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.recent-item:active .play-overlay {
  opacity: 1;
}

.recent-title {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  padding: 0 4px;
}

.recent-artist {
  font-size: 12px;
  color: rgba($text-secondary, 0.6);
  margin-top: 2px;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Bento 网格
.bento-section {
  margin-top: $lg;
}

.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $md;
}

.bento-item {
  padding: $md;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: $sm;
  cursor: pointer;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.96);
  }

  &.wide {
    grid-column: span 2;
    flex-direction: row;
    align-items: center;
    gap: $md;
    padding: $md;
  }
}

.bento-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(39, 174, 96, 0.1);
}

.bento-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bento-title {
  font-size: 15px;
  font-weight: 500;
  color: $text-primary;
}

.bento-count {
  font-size: 12px;
  font-weight: 600;
  color: rgba($text-secondary, 0.6);
  margin-top: 2px;
}

// 设置菜单
.menu-section {
  margin-top: $lg;
}

.menu-card {
  border-radius: 12px;
  overflow: hidden;

  :deep(.van-cell) {
    background: transparent;
    padding: 14px $md;
    font-size: 15px;
    color: $text-primary;
  }

  :deep(.van-cell__left-icon) {
    color: $text-secondary;
    font-size: 20px;
  }

  :deep(.van-cell--clickable:active) {
    background: rgba(0, 0, 0, 0.02);
  }
}

.logout-cell {
  :deep(.van-cell__title) {
    color: #ba1a1a;
  }
}

// 危险操作（注销账号）红色样式
.danger-cell {
  :deep(.van-cell__title),
  :deep(.van-cell__left-icon) {
    color: #e74c3c;
  }
}
</style>
