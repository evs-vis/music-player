<script setup>
import logoUrl from '@/assets/logo.png'
import avatarUrl from '@/assets/avatar.jpg'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
const router = useRouter()
const authStore = useAuthStore()
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const avatarSrc = computed(() => {
  const custom = authStore.user?.avatar
  if (custom) return baseURL + custom
  return avatarUrl
})
const handleLogin = () => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
  }
  router.push('/mine')

  // console.log('handleLogin')
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
      />
      <h1 class="title">Music Player</h1>
    </div>

    <div class="right" @click="handleLogin">
      <van-image
        :src="avatarSrc"
        width="31"
        height="31"
        round
        fit="cover"
        class="avatar"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-header {
  // position: sticky;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);

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
