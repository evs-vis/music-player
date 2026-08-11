<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 是否显示底部导航栏：除歌单详情/播放/登录等二级页外均显示
const showTabbar = computed(() => route.meta.showTabbar !== false)

// Tab 切换时滚动回顶部：tab 页均为独立路由组件（无 keep-alive），
// 切换后新页面从顶部开始浏览，符合移动端 Tab 应用惯例
watch(
  () => route.path,
  () => {
    window.scrollTo(0, 0)
  }
)
</script>

<template>
  <div class="layout">
    <main class="content">
      <router-view />
    </main>

    <!-- 底部导航栏：route 模式自动按当前路由高亮并跳转，无需手动管理 active -->
    <van-tabbar v-if="showTabbar" route safe-area-inset-bottom>
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
  padding-bottom: calc($tabbar-height + $mini-player-height + 8px + $safe-area-inset-bottom);
}
</style>
