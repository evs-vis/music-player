<script setup>
import logoUrl from '@/assets/logo.svg'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
const router = useRouter()
const authStore = useAuthStore()
const handleLogin = () => {
  // 未登录先跳登录页并 return，避免紧接着 push /mine 造成跳转竞态
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push('/mine')
}
</script>
<template>
  <div class="app-header">
    <div class="left">
      <van-image
        :src="logoUrl"
        width="31"
        height="31"
        radius="30%"
        fit="contain"
        alt="Music Player 标志"
      />
      <h1 class="title">Music Player</h1>
    </div>

    <div class="right" @click="handleLogin">
      <van-image
        :src="authStore.avatarSrc"
        width="100%"
        height="100%"
        round
        fit="cover"
        class="avatar"
        alt="用户头像"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-header {
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(0.75rem);
  -webkit-backdrop-filter: blur(0.75rem);

  .left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-size: 20px;
    font-weight: 700;
    color: #006d37;
    white-space: nowrap;
    margin: 5px;
  }

  .right {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    cursor: pointer;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: border-color 0.2s;
    &:hover {
      border-color: rgba(255, 255, 255, 0.8);
    }
  }
}
</style>
