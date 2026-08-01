<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

// const router = useRouter()
const route = useRoute()
const active = ref(0)

// 是否显示底部导航栏
const showTabbar = computed(() => {
  return route.meta.showTabbar !== false
})

// // 是否显示迷你播放器（除播放页外都显示）
// const showMiniPlayer = computed(() => {
//   return route.name !== 'Play'
// })

const onTabChange = () => {
  // Vant Tabbar route 模式会自动处理路由跳转
}
</script>

<template>
  <div class="layout">
    <div class="content">
      <router-view />
    </div>

    <!-- 迷你播放器占位（后续实现） -->
    <!-- <MiniPlayer v-if="showMiniPlayer" /> -->

    <!-- 底部导航栏 -->
    <van-tabbar v-if="showTabbar" v-model="active" @change="onTabChange" route>
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/category" icon="apps-o">歌单</van-tabbar-item>
      <van-tabbar-item to="/search" icon="search">搜索</van-tabbar-item>
      <van-tabbar-item to="/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #d5f1e4 0%, #f5f9f7 100%);
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding-bottom: calc($tabbar-height + $mini-player-height + 8px);
}
</style>
