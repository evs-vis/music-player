<template>
  <div class="page">
    <h2>注册</h2>
    <van-form @submit="onRegister">
      <van-field
        v-model="username"
        label="用户名"
        placeholder="请输入用户名"
        :rules="[{ required: true, message: '请填写用户名' }]"
      />
      <van-field
        v-model="password"
        type="password"
        label="密码"
        placeholder="请输入密码"
        :rules="[{ required: true, message: '请填写密码' }]"
      />
      <van-button type="primary" native-type="submit" :loading="loading">
        注册
      </van-button>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showNotify } from 'vant' // 注意导入方式
import { useAuthStore } from '@/stores'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
console.log(username.value)

const onRegister = async () => {
  try {
    await authStore.register(username.value, password.value)
    showNotify({ type: 'success', message: '注册成功，请登录' })
    router.push('/login')
  } catch (err) {
    const msg = err.response?.data?.message || '注册失败，请重试'
    showNotify({ type: 'danger', message: msg })
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.page {
  padding: 20px;
}
</style>
