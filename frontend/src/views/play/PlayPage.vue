<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore, useAuthStore, useFavoritesStore } from '@/stores'
import { showToast } from 'vant'

const router = useRouter()
const playerStore = usePlayerStore()
const favoritesStore = useFavoritesStore()
const authStore = useAuthStore()
const lyricsMiniRef = ref(null)
const lyricsFullRef = ref(null)
const modeConfig = {
  loop: { icon: 'play', color: '#27ae60' },
  one: { icon: 'replay', color: '#e74c3c' },
  shuffle: { icon: 'exchange', color: '#f39c12' }
}
// 是否显示歌词模式
const showLyrics = ref(false)

// 点击封面区域切换模式
const toggleLyrics = () => {
  showLyrics.value = !showLyrics.value
}
// 播放列表弹层开关
const showPlaylistSheet = ref(false)

// 音量滑块可见性
const showVolumeSlider = ref(false)

// 当前歌曲
const currentSong = computed(() => playerStore.currentSong)

// 播放模式图标/颜色映射：切换模式时按钮图标随之变化
const modeIcon = computed(() => modeConfig[playerStore.playMode]?.icon || 'play')
const modeColor = computed(() => modeConfig[playerStore.playMode]?.color || '#27ae60')

// 收藏状态：无歌曲时 store 中无对应 id，直接返回 false
const isFav = computed(() =>
  currentSong.value ? favoritesStore.isFavorite(currentSong.value.id) : false
)

// 歌词处理
const currentLyricIndex = ref(-1)
// =================== 歌词二分查找（重构版） ===================
// 1. 纯二分查找函数：返回 lyrics 中最后一个 time <= 当前播放时间的索引
function binarySearchLyricIndex(lyrics, time) {
  if (!lyrics || lyrics.length === 0) return -1

  // 边界处理：如果时间早于第一句，高亮第一句（与旧逻辑保持一致）
  if (time < lyrics[0].time) return 0
  // 边界处理：如果时间晚于最后一句，高亮最后一句
  if (time >= lyrics[lyrics.length - 1].time) return lyrics.length - 1

  let left = 0
  let right = lyrics.length - 1
  let ans = 0

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    // 核心：当中间句的时间 <= 当前播放时间，说明这一句以及它之前的所有句子都“已过时”，记录 ans 并向右找更晚的
    if (lyrics[mid].time <= time) {
      ans = mid
      left = mid + 1
    } else {
      // 否则，当前中间句时间太靠后了，向左找
      right = mid - 1
    }
  }
  return ans
}

// 2. 极简更新函数（删掉了全部 while 循环和游标依赖）
function updateLyricIndex() {
  const lyrics = currentSong.value?.lyrics
  if (!lyrics || lyrics.length === 0) {
    currentLyricIndex.value = -1
    return
  }
  // 一行定位，天下太平
  currentLyricIndex.value = binarySearchLyricIndex(lyrics, playerStore.currentTime)
}

// 3. 监听播放时间变化（无论正常播放还是拖拽 Seek，均触发更新）
watch(() => playerStore.currentTime, updateLyricIndex)

// 4. 监听切歌（注意：删掉了原来的重置为 0 的逻辑，因为二分查找不依赖旧索引）
watch(
  () => playerStore.currentSong?.id,
  () => {
    // 切歌时直接更新索引；由于 currentTime 可能为 0 或上次残留值，二分查找都能精准适配
    updateLyricIndex()
    // 注意：滚动到当前行由下面的 watch([currentLyricIndex, showLyrics]) 自动触发，无需手动干预
  },
  { immediate: true }
)

// 计算拖动位置对应的播放时间
const seekRatio = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  // 兼容鼠标（clientX）与触摸（changedTouches/touches）：
  // touchend/touchcancel 事件没有 touches，需用 changedTouches 才能拿到手指坐标
  const point = event.touches?.[0] || event.changedTouches?.[0]
  const x = point?.clientX ?? event.clientX
  const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
  return ratio * playerStore.duration
}

// 开始拖动进度条：进入拖动状态，更新预览（不真正 seek）
const startSeek = (event) => {
  playerStore.isDragging = true
  playerStore.currentTime = seekRatio(event)
}

// 拖动中：只更新预览，由 isDragging 抑制 timeupdate 写回
const dragSeek = (event) => {
  if (!playerStore.isDragging) return
  playerStore.currentTime = seekRatio(event)
}

// 结束拖动：退出拖动状态并真正 seek
const endSeek = (event) => {
  if (!playerStore.isDragging) return
  playerStore.seekTo(seekRatio(event))
  playerStore.isDragging = false
}

// 播放/暂停
const togglePlay = () => {
  playerStore.togglePlay()
}

// 上下曲
const prev = () => playerStore.playPrev()
const next = () => playerStore.playNext()

// 切换模式
const changeMode = () => playerStore.changeMode()

// 收藏切换
const toggleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    showToast({ type: 'warning', message: '请先登录' })
    return
  }
  try {
    await favoritesStore.toggleFavorite(currentSong.value.id)
  } catch {
    showToast({ type: 'fail', message: '操作失败' })
  }
}

// 音量控制
const toggleMute = () => {
  if (playerStore.volume > 0) {
    playerStore.lastVolume = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(playerStore.lastVolume || 1)
  }
}

// 无歌曲时重定向
watch(
  () => playerStore.currentSong,
  (val) => {
    if (!val) {
      router.replace('/home')
    }
  },
  { immediate: true }
)

// 歌词索引变化 / 唱片·歌词模式切换时，让当前行平滑滚动居中
function scrollActiveLyricLine() {
  const container = showLyrics.value ? lyricsFullRef.value : lyricsMiniRef.value
  if (container) scrollToLine(container)
}
watch([currentLyricIndex, showLyrics], () => nextTick(scrollActiveLyricLine))

// 切换歌曲时重置滚动位置并居中当前行
watch(
  () => playerStore.currentSong?.id,
  () => {
    nextTick(() => {
      for (const ref of [lyricsMiniRef, lyricsFullRef]) {
        const el = ref.value
        if (el) {
          el.scrollTop = 0
          scrollToLine(el)
        }
      }
    })
  }
)

// 歌词滚动动画（按容器独立管理，切换模式/快速跳转时不会互相打架）
// 用 Map（可迭代）而非 WeakMap：key 恒为两个固定 ref，且卸载时需要遍历清理动画帧
const scrollAnimFrames = new Map()

function scrollToLine(container) {
  const activeLine = container.querySelector('.lyric-line.active')
  if (!activeLine) return

  const containerRect = container.getBoundingClientRect()
  const lineRect = activeLine.getBoundingClientRect()

  //基于容器相对位置计算目标，不受 offsetParent 影响，居中更准确
  const targetTop =
    container.scrollTop +
    lineRect.top -
    containerRect.top -
    (containerRect.height - lineRect.height) / 2

  // 边界夹紧，避免超出可滚动范围
  const maxScroll = container.scrollHeight - container.clientHeight
  const target = Math.min(Math.max(targetTop, 0), maxScroll)
  const start = container.scrollTop
  const distance = target - start
  if (Math.abs(distance) < 1) return

  // 取消上一次未完成的动画
  const prev = scrollAnimFrames.get(container)
  if (prev !== undefined) cancelAnimationFrame(prev)

  // 尊重系统"减弱动态效果"
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    container.scrollTop = target
    return
  }

  const duration = 300
  let startTime = null

  function animate(currentTime) {
    if (startTime === null) startTime = currentTime
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    container.scrollTop = start + distance * ease
    if (progress < 1) {
      scrollAnimFrames.set(container, requestAnimationFrame(animate))
    } else {
      scrollAnimFrames.delete(container)
    }
  }
  scrollAnimFrames.set(container, requestAnimationFrame(animate))
}

onMounted(() => {
  // 登录会话内已加载过则短路，不重复请求（store 内部处理未登录）
  favoritesStore.loadFavorites()
})

// 卸载时取消歌词滚动动画，避免 rAF 空转并持有已卸载容器引用（#20）
onUnmounted(() => {
  // Map 可迭代：遍历所有未完成的动画帧并取消，防止 rAF 空转持有已卸载容器
  scrollAnimFrames.forEach((frameId) => {
    cancelAnimationFrame(frameId)
  })
  scrollAnimFrames.clear()
})
</script>

<template>
  <div class="play-page" v-if="currentSong">
    <!-- 模糊背景 -->
    <div class="bg-blur" :style="{ backgroundImage: `url(${currentSong.cover})` }" />

    <!-- 头部导航 -->
    <header class="play-header">
      <button class="header-btn" @click="router.back()">
        <van-icon name="arrow-down" size="22" color="#fff" />
      </button>
      <div class="header-info">
        <span class="subtitle">Now Playing</span>
        <span class="title-text">{{ currentSong.title }}</span>
      </div>
      <button class="header-btn">
        <van-icon name="ellipsis" size="22" color="#fff" />
      </button>
    </header>

    <!-- 歌曲信息与封面 -->
    <main class="play-main" @click="toggleLyrics">
      <!-- 唱片模式 -->
      <template v-if="!showLyrics">
        <div class="album-art-wrapper" :class="{ 'is-paused': !playerStore.isPlaying }">
          <div class="album-art">
            <van-image
              :src="currentSong.cover"
              width="100%"
              height="100%"
              fit="cover"
              radius="12px"
              :alt="'专辑封面：' + currentSong.title"
            />
            <div class="vinyl-overlay" />
            <!-- 音频缓冲 loading：弱网/切歌等待时显示，避免"点了没反应" -->
            <div v-if="playerStore.isBuffering" class="buffering-mask">
              <van-loading type="spinner" color="#fff" size="32" />
            </div>
            <!-- 音频加载失败重试入口：error 事件置真后显示，点击重新加载当前歌曲 -->
            <div v-else-if="playerStore.audioError" class="buffering-mask">
              <button class="retry-btn" @click="playerStore.requestRetry()">
                <van-icon name="replay" size="20" />
                <span>音频加载失败，点击重试</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 唱片模式的小歌词 -->
        <div class="lyrics-container lyrics-mini" ref="lyricsMiniRef">
          <template v-if="currentSong.lyrics?.length">
            <p
              v-for="(line, index) in currentSong.lyrics"
              :key="index"
              class="lyric-line"
              :class="{ active: index === currentLyricIndex }"
            >
              {{ line.text }}
            </p>
          </template>
          <p v-else class="no-lyrics">暂无歌词</p>
        </div>
      </template>

      <!-- 歌词模式（铺满） -->
      <div v-else class="lyrics-full" ref="lyricsFullRef">
        <template v-if="currentSong.lyrics?.length">
          <p
            v-for="(line, index) in currentSong.lyrics"
            :key="index"
            class="lyric-line lyric-line-lg"
            :class="{ active: index === currentLyricIndex }"
          >
            {{ line.text }}
          </p>
        </template>
        <p v-else class="no-lyrics">暂无歌词</p>
      </div>
    </main>
    <!-- 底部控制面板 -->
    <footer class="play-footer">
      <div class="glass-panel">
        <!-- 进度条 -->
        <div class="progress-area">
          <div class="time-labels">
            <span>{{ playerStore.currentTimeFormatted }}</span>
            <span>{{ playerStore.durationFormatted }}</span>
          </div>
          <div
            class="progress-bar"
            @mousedown="startSeek"
            @touchstart="startSeek"
            @touchmove="dragSeek"
            @mouseup="endSeek"
            @touchend="endSeek"
          >
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: playerStore.progress + '%' }">
                <div class="progress-thumb" />
              </div>
            </div>
          </div>
        </div>

        <!-- 播放控制 -->
        <div class="controls">
          <div class="main-buttons">
            <button @click="prev">
              <van-icon name="arrow-left" size="36" />
            </button>
            <button class="play-btn" @click="togglePlay">
              <van-icon
                :name="playerStore.isPlaying ? 'pause-circle-o' : 'play-circle-o'"
                size="48"
              />
            </button>
            <button @click="next">
              <van-icon name="arrow" size="36" />
            </button>
          </div>
        </div>

        <!-- 底部操作栏与音量 -->
        <div class="actions-area">
          <div class="left-actions">
            <button @click="toggleFavorite">
              <van-icon
                :name="isFav ? 'like' : 'like-o'"
                :color="isFav ? '#E74C3C' : '#fff'"
                size="20"
              />
              <span>Like</span>
            </button>
            <div class="volume-control">
              <button @click="toggleMute">
                <van-icon
                  :name="playerStore.volume === 0 ? 'volume-o' : 'volume'"
                  size="20"
                  color="#fff"
                />
              </button>
              <div v-if="showVolumeSlider" class="volume-slider-wrapper">
                <van-slider
                  v-model="playerStore.volume"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  style="width: 80px"
                />
              </div>
            </div>
          </div>
          <div class="right-actions">
            <button @click="showPlaylistSheet = true">
              <van-icon name="orders-o" size="20" color="#fff" />
            </button>
            <button @click="changeMode" class="active">
              <van-icon :name="modeIcon" :color="modeColor" size="24" />
            </button>
          </div>
        </div>
      </div>
    </footer>

    <!-- 播放列表弹层 -->
    <playlist-sheet v-model:show="showPlaylistSheet" />
  </div>
</template>

<style lang="scss" scoped>
.play-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: #000;
  // overflow: auto;
  overflow: hidden;
  color: #fff;
  &::-webkit-scrollbar {
    display: none;
  }
}

// 模糊背景
.bg-blur {
  position: absolute;
  inset: -10px;
  background-size: cover;
  background-position: center;
  filter: blur(30px);
  opacity: 0.5;
  transform: scale(1.1);
  z-index: 0;
}

// 头部
.play-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $md $safe-margin;
  margin-top: 16px;
  margin-bottom: 8px;
}

.header-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: none;
  cursor: pointer;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.95);
  }
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 200px;
  overflow: hidden;
}

.subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.title-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

// 主要内容
.play-main {
  // min-height: 100vh;
  min-height: 0;
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 50px;
  gap: $lg;
  overflow: hidden;
}

// 专辑封面
.album-art-wrapper {
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1;
  transition: animation-play-state 0.5s;

  &.is-paused .album-art {
    animation-play-state: paused;
  }
}

.album-art {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  position: relative;
  animation: rotate-slow 20s linear infinite;
  margin-top: 32px;
  margin-bottom: 8px;
}

.vinyl-overlay {
  position: absolute;
  inset: 0;
  border: 8px solid rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  pointer-events: none;
}

.buffering-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 12px;
  z-index: 2;
}

// 音频失败重试按钮
.retry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: rgba(255, 255, 255, 0.3);
  }
}

@keyframes rotate-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 歌词区域
.lyrics-container {
  margin-top: 32px;
  width: 100%;
  max-height: 80px;
  overflow-y: auto;
  text-align: center;
  // 上下留出半屏空白，保证首行/末行也能滚动到正中间
  padding: 40px 0;
  mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);

  &::-webkit-scrollbar {
    display: none;
  }
}

// 唱片模式小歌词
.lyrics-mini {
  max-height: 100px;
  overflow-y: auto;
  width: 100%;
  text-align: center;
  transition: opacity 0.3s ease;

  &::-webkit-scrollbar {
    display: none;
  }
}

// 歌词模式铺满
.lyrics-full {
  height: 200px;
  flex: 1;
  width: 100%;
  overflow-y: auto;
  text-align: center;
  padding: 50% 0;

  &::-webkit-scrollbar {
    display: none;
  }
}

.lyric-line {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  padding: 4px 0;

  &.active {
    color: #27ae60;
    font-weight: 600;
  }
}

.lyric-line-lg {
  font-size: 16px;
  padding: 8px 0;

  &.active {
    font-size: 18px;
  }
}

.no-lyrics {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
}

// 底部控制面板
.play-footer {
  position: relative;
  z-index: 10;
  padding: 0 $safe-margin calc($md + $safe-area-inset-bottom);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: $md;
  display: flex;
  flex-direction: column;
  gap: $md;
}

// 进度条
.progress-area {
  width: 100%;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: $xs;
}

.progress-bar {
  width: 100%;
  height: 16px;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: visible;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: $primary-color;
  border-radius: 2px;
  position: relative;
  transition: width 0.1s linear;
}

.progress-thumb {
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

// 控制按钮
.controls {
  display: flex;
  justify-content: center;
  align-items: center;

  button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 8px;
    transition:
      color 0.2s,
      transform 0.2s;

    &.active {
      color: $primary-color;
    }

    &:active {
      transform: scale(0.9);
    }
  }
}

.main-buttons {
  display: flex;
  align-items: center;
  gap: $md;

  .play-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }
  }
}

// 底部操作
.actions-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $sm;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: $lg;

  button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    gap: $xs;
    cursor: pointer;
    font-size: 14px;

    &:active {
      opacity: 0.8;
    }
  }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: $sm;
  position: relative;
}

.volume-slider-wrapper {
  position: absolute;
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  padding: 8px;
  border-radius: 20px;
}

.right-actions {
  display: flex;
  gap: $lg;

  button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background 0.2s;

    &:active {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
