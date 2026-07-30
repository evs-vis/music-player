<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { showNotify, showToast } from 'vant'
import logoUrl from '@/assets/logo.png'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const passwordVisible = ref(false)

// 登录
const handleLogin = async () => {
  if (!username.value.trim() || !password.value.trim()) {
    showNotify({ type: 'warning', message: '请输入用户名和密码' })
    return
  }
  loading.value = true
  try {
    await authStore.login(username.value.trim(), password.value)
    showToast({ type: 'success', message: '登录成功', duration: 1500 })
    setTimeout(() => {
      router.replace('/home')
    }, 500)
  } catch (error) {
    const msg = error?.response?.data?.error || '登录失败，请重试'
    showNotify({ type: 'danger', message: msg })
  } finally {
    loading.value = false
  }
}

// 切换密码可见性
const togglePasswordVisible = () => {
  passwordVisible.value = !passwordVisible.value
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo 区域 -->
      <div class="logo-area">
        <div class="logo-img-wrapper animate-float">
          <van-image :src="logoUrl" width="96" height="96" fit="contain" />
        </div>
        <h1 class="app-title">Music Player</h1>
        <p class="app-subtitle">让旋律触动心弦</p>
      </div>

      <!-- 登录表单卡片 -->
      <div class="login-card glass-card">
        <van-form @submit="handleLogin">
          <!-- 用户名 -->
          <van-field
            v-model="username"
            name="username"
            label="用户名"
            placeholder="输入用户名"
            left-icon="user-o"
            :rules="[{ required: true, message: '请输入用户名' }]"
          />
          <!-- 密码 -->
          <van-field
            v-model="password"
            name="password"
            label="密码"
            placeholder="输入你的密码"
            :type="passwordVisible ? 'text' : 'password'"
            left-icon="lock"
            :right-icon="passwordVisible ? 'eye-o' : 'closed-eye'"
            @click-right-icon="togglePasswordVisible"
            :rules="[{ required: true, message: '请输入密码' }]"
          />

          <!-- 辅助链接 -->
          <div class="link-row">
            <a class="link" @click.stop>忘记密码?</a>
            <router-link to="/register" class="link primary"
              >立即注册</router-link
            >
          </div>

          <!-- 登录按钮 -->
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="loading"
            loading-text="登录中..."
            class="login-btn"
          >
            登录
          </van-button>
        </van-form>

        <!-- 分割线 -->
        <div class="divider">
          <span class="divider-text">其他登录方式</span>
        </div>

        <!-- 第三方登录 -->
        <div class="third-party">
          <button class="icon-btn wechat-btn">
            <!-- 微信 SVG -->
            <svg class="icon-svg" viewBox="0 0 24 24">
              <path
                d="M8.221 11.232c-.419 0-.761-.341-.761-.762s.341-.761.761-.761.762.341.762.761-.342.762-.762.762zm4.316 0c-.42 0-.762-.341-.762-.762s.342-.761.762-.761.762.341.762.761-.342.762-.762.762zm7.632-2.023C20.169 4.129 16.368 1 11.758 1 6.58 1 2.38 4.604 2.38 9.053c0 2.451 1.272 4.649 3.259 6.079l-.859 2.573 2.999-1.503c1.229.412 2.576.643 3.979.643.277 0 .551-.01.821-.028-.242-.776-.375-1.599-.375-2.455 0-4.321 3.901-7.824 8.709-7.824.402 0 .798.026 1.181.074.015-.224.032-.449.032-.676zm2.355 7.15c0-3.323-2.923-6.017-6.529-6.017-3.606 0-6.53 2.694-6.53 6.017 0 3.323 2.924 6.017 6.53 6.017.618 0 1.21-.081 1.772-.232l1.69.848-.485-1.45c1.472-.947 2.428-2.441 2.428-4.095-.015.428-.487.614-.875.614s-.701-.186-.701-.614.313-.614.701-.614.875.186.875.614c0 0 .151.314.151.314.419 0 .761-.341.761-.762s-.341-.762-.761-.762zm-5.741.979c-.313 0-.568-.255-.568-.568s.255-.568.568-.568.568.255.568.568-.255.568-.568.568zm3.228 0c-.314 0-.569-.255-.569-.568s.255-.568.569-.568.569.255.569.568-.256.568-.569.568z"
              />
            </svg>
          </button>
          <button class="icon-btn qq-btn">
            <!-- QQ SVG -->
            <svg class="icon-svg" viewBox="0 0 24 24">
              <path
                d="M11.96 1c-5.522 0-10 4.477-10 10 0 1.57.362 3.056 1.011 4.378L1 23l7.854-1.921A9.957 9.957 0 0011.96 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18c-1.52 0-2.955-.407-4.195-1.118l-.3-.17-3.056.748.761-2.946-.188-.3A7.95 7.95 0 013.96 11c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 底部协议 -->
      <p class="agreement">
        登录即代表您已阅读并同意<br />
        <a class="link primary" @click.stop>用户协议</a> 与
        <a class="link primary" @click.stop>隐私政策</a>
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $xl $safe-margin;
  background: $bg-gradient;
}

.login-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// Logo 区域
.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: $lg;
}

.logo-img-wrapper {
  width: 96px;
  height: 96px;
  margin-bottom: $md;
}

.app-title {
  font-size: 32px;
  font-weight: 800;
  color: $primary-color;
  line-height: 1;
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba($text-secondary, 0.7);
  margin-top: $xs;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

// 浮动动画
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.login-card {
  width: 80%;
  padding: $xl;
}

// 表单项微调
:deep(.van-field) {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  margin-bottom: $md;
  transition: all 0.3s;

  .van-field__label {
    margin-bottom: 3px; // 控制标签与输入框的间距
    width: 50px; // 防止标签宽度占用空间
  }

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &.van-field--focused {
    background: rgba(255, 255, 255, 0.4);
    border-color: $primary-color;
    box-shadow: 0 0 0 4px rgba(39, 174, 96, 0.1);
  }
}

.link-row {
  display: flex;
  justify-content: space-between;
  padding: $xs $sm;
  margin-bottom: $md;
}

.link {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  text-decoration: none;
  cursor: pointer;

  &.primary {
    color: $primary-color;
    font-weight: 700;
  }

  &:active {
    opacity: 0.8;
  }
}

.login-btn {
  margin-top: $sm;
  height: 48px;
  font-size: 18px;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
  transition: all 0.2s;

  &:active {
    transform: scale(0.96);
  }
}

// 分割线
.divider {
  display: flex;
  align-items: center;
  margin: $lg 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba($text-secondary, 0.15);
  }
}

.divider-text {
  padding: 0 $md;
  font-size: 12px;
  font-weight: 600;
  color: rgba($text-secondary, 0.5);
  white-space: nowrap;
}

// 第三方登录
.third-party {
  display: flex;
  justify-content: center;
  gap: $xl;
}

.icon-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.2s,
    background 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.4);
  }
}

.icon-svg {
  width: 24px;
  height: 24px;
}

.wechat-btn {
  color: #07c160;
}

.qq-btn {
  color: #12b7f5;
}

// 底部协议
.agreement {
  margin-top: $lg;
  font-size: 12px;
  font-weight: 600;
  color: rgba($text-secondary, 0.6);
  text-align: center;
  line-height: 1.8;

  .link {
    font-size: 12px;
  }
}
</style>
