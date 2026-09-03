<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 是否显示底部导航栏：除歌单详情/播放/登录等二级页外均显示
const showTabbar = computed(() => route.meta.showTabbar !== false)

// 切换后新页面从顶部开始浏览
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

.van-tabbar {
  border-radius: 1.5rem 1.5rem 0 0 !important;
  background: rgb(221, 243, 231) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1) !important;
  height: 60px;
}

.van-tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  transition: all 0.2s;
}

.van-tabbar-item--active {
  background-color: rgba(213, 246, 228, 0.5);
  color: rgb(39, 171, 105);
}

.van-tabbar-item__icon {
  font-size: 24px !important;
}
.van-tabbar-item__text {
  font-size: 12px !important;
}
</style>
