<template>
  <div class="page">
    <h2>登录</h2>
    <van-form @submit="onLogin">
      <van-cell-group inset>
        <van-field
          v-model="username"
          name="用户名"
          label="用户名"
          placeholder="请输入用户名"
        />
        <van-field
          v-model="password"
          type="password"
          name="密码"
          label="密码"
          placeholder="请输入密码"
        />
      </van-cell-group>
      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit"
          >登录</van-button
        >
        <van-button
          round
          block
          type="default"
          @click="$router.push('/register')"
          style="margin-top: 10px"
          >去注册</van-button
        >
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/index'
import { useRouter } from 'vue-router'
import { showNotify } from 'vant'

const username = ref('')
const password = ref('')
const authStore = useAuthStore()
const router = useRouter()

const onLogin = async () => {
  try {
    await authStore.login(username.value, password.value)
    showNotify({ type: 'success', message: '登录成功' })
    router.replace('/')
  } catch (err) {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      '登录失败，请重试'
    showNotify({ type: 'danger', message: msg })
  }
}
</script>

<style scoped>
.page {
  padding: 20px;
}
</style>
