<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { showToast } from 'vant'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const agreement = ref(false)
const loading = ref(false)
const passwordVisible = ref(false)

const togglePasswordVisible = () => {
  passwordVisible.value = !passwordVisible.value
}

const handleRegister = async () => {
  if (!agreement.value) {
    showToast({ type: 'warning', message: '请阅读并同意用户协议与隐私政策' })
    return
  }
  loading.value = true
  try {
    await authStore.register(username.value.trim(), password.value)
    showToast({
      type: 'success',
      message: '注册成功，即将跳转登录',
      duration: 1000
    })
    setTimeout(() => {
      router.replace('/login')
    }, 1500)
  } catch (error) {
    const msg = error?.response?.data?.error || '注册失败，请重试'
    showToast({ type: 'fail', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <!-- 背景装饰粒子 -->
    <div class="particle particle-1" />
    <div class="particle particle-2" />

    <!-- 顶部简化导航栏 -->
    <header class="top-bar">
      <div class="logo-area">
        <span class="icon graphic_eq">♪</span>
        <span class="brand-name">Music Player</span>
      </div>
    </header>

    <main class="form-container">
      <div class="form-wrapper">
        <!-- 标题区 -->
        <div class="header-text">
          <h1 class="title">创建账号</h1>
          <p class="subtitle">开启您的个性化高保真音乐之旅</p>
        </div>

        <!-- 注册表单 -->
        <van-form @submit="handleRegister" class="register-form">
          <!-- 用户名 -->
          <div class="field-item">
            <label class="field-label" for="username">用户名</label>
            <div class="input-wrapper">
              <van-icon name="user-o" class="input-icon" />
              <input
                id="username"
                v-model="username"
                type="text"
                class="glass-input"
                placeholder="输入您的用户名"
                autocomplete="username"
              />
            </div>
          </div>

          <!-- 密码 -->
          <div class="field-item">
            <label class="field-label" for="password">密码</label>
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <input
                id="password"
                v-model="password"
                :type="passwordVisible ? 'text' : 'password'"
                class="glass-input pr-12"
                placeholder="至少 8 位字符"
                autocomplete="new-password"
              />
              <button type="button" class="toggle-visibility" @click="togglePasswordVisible">
                <van-icon :name="passwordVisible ? 'eye-o' : 'closed-eye'" />
              </button>
            </div>
          </div>

          <!-- 协议勾选 -->
          <div class="agreement-row">
            <label class="checkbox-label" :class="{ checked: agreement }">
              <input v-model="agreement" type="checkbox" class="custom-checkbox" />
              <span class="check-mark" v-if="agreement">✓</span>
            </label>
            <span class="agreement-text">
              我已阅读并同意
              <a class="link" @click.stop>用户协议</a> 与
              <a class="link" @click.stop>隐私政策</a>
            </span>
          </div>

          <!-- 注册按钮 -->
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="loading"
            loading-text="注册中..."
            class="submit-btn"
          >
            注册
          </van-button>
        </van-form>

        <!-- 第三方注册（可选） -->
        <div class="divider-section">
          <div class="divider-line" />
          <span class="divider-text">或者使用</span>
          <div class="divider-line" />
        </div>
        <div class="social-buttons">
          <button class="social-btn"><van-icon name="wechat" /></button>
          <button class="social-btn"><van-icon name="qq" /></button>
          <button class="social-btn"><van-icon name="phone" /></button>
        </div>

        <!-- 底部跳转登录 -->
        <p class="login-redirect">
          已经有账号了？
          <router-link to="/login" class="link-highlight">立即登录</router-link>
        </p>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.register-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-gradient;
  overflow-x: hidden;
  padding: $md $xl;
}

// 粒子装饰
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(39, 174, 96, 0.2) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.particle-1 {
  width: 256px;
  height: 256px;
  top: -80px;
  left: -80px;
}
.particle-2 {
  width: 384px;
  height: 384px;
  top: 50%;
  right: -128px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $md 0;
  z-index: 10;
}

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
  font-size: 28px;
  font-weight: 800;
  color: $primary-color;
  letter-spacing: -0.02em;
}

.form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-bottom: $xl;
  z-index: 10;
}

.form-wrapper {
  width: 100%;
  max-width: 448px;
}

.header-text {
  margin-bottom: $xl;
  text-align: center;
}

.title {
  font-size: $lg;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: $xs;
}

.subtitle {
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: $lg;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: $xs;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  padding-left: $xs;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  font-size: 18px;
  color: $text-secondary;
  z-index: 1;
  pointer-events: none;
}

.glass-input {
  width: 100%;
  height: 56px;
  padding: 0 16px 0 44px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  transition: all 0.3s;
  outline: none;

  &::placeholder {
    color: rgba($text-secondary, 0.6);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.5);
    border-color: $primary-color;
    box-shadow: 0 0 0 4px rgba(39, 174, 96, 0.1);
  }

  &.pr-12 {
    padding-right: 48px;
  }
}

.toggle-visibility {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: $text-secondary;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.agreement-row {
  display: flex;
  align-items: center;
  gap: $sm;
  padding: $xs;
}

.checkbox-label {
  position: relative;
  width: 20px;
  height: 20px;
  border: 2px solid rgba($text-secondary, 0.3);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  &.checked {
    background: $primary-color;
    border-color: $primary-color;
  }
}

.custom-checkbox {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  margin: 0;
}

.check-mark {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.agreement-text {
  font-size: 14px;
  color: $text-secondary;
  user-select: none;
  .link {
    color: $primary-color;
    font-weight: 700;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
}

.submit-btn {
  margin-top: $sm;
  height: 52px;
  font-size: 18px;
  font-weight: 700;
  background: $primary-color;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
  transition: all 0.2s;
  &:active {
    transform: scale(0.96);
  }
}

.divider-section {
  display: flex;
  align-items: center;
  margin: $xl 0 $lg;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba($text-secondary, 0.15);
}

.divider-text {
  padding: 0 $md;
  font-size: 12px;
  font-weight: 600;
  color: rgba($text-secondary, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.social-buttons {
  display: flex;
  justify-content: center;
  gap: $md;
}

.social-btn {
  width: 64px;
  height: 52px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.6);
    color: $primary-color;
  }
}

.login-redirect {
  margin-top: $xl;
  text-align: center;
  font-size: 14px;
  color: $text-secondary;
  .link-highlight {
    color: $primary-color;
    font-weight: 700;
    padding: 0 $xs;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
