<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

const passwordVisible1 = ref(false)
const passwordVisible2 = ref(false)
const password = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const pattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/

// 三个字段均为 van-field，用 :rules 实时校验（与登录/注册页一致）
const oldPwdRules = [{ required: true, message: '请输入旧密码' }]
const newPwdRules = [
  { required: true, message: '请输入新密码' },
  { pattern, message: '新密码需为8-16位字母和数字组合' }
]
// 确认密码需与「新密码」一致；computed 保证校验时取到最新值
const confirmRules = computed(() => [
  { required: true, message: '请再次输入新密码' },
  { validator: (v) => v === newPassword.value, message: '两次密码不一致' }
])

const togglePasswordVisible = (index) => {
  if (index === 1) {
    passwordVisible1.value = !passwordVisible1.value
  } else if (index === 2) {
    passwordVisible2.value = !passwordVisible2.value
  }
}

const handleSubmit = async () => {
  // 校验由 van-field :rules 完成，提交时只需调接口
  loading.value = true
  try {
    await authStore.changePwd({
      oldPassword: password.value,
      newPassword: newPassword.value
    })

    showToast({ message: '修改成功，即将重新登录', duration: 1500 })
    authStore.logout()

    setTimeout(() => {
      router.replace('/login')
    }, 1500)
  } catch (err) {
    const msg = err.response?.data?.error || '修改失败'
    showToast({ type: 'fail', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="change-pwd-page">
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
          <h1 class="title">修改密码</h1>
          <p class="subtitle">为了账户安全，请定期更新您的密码</p>
        </div>

        <!-- 修改密码表单 -->
        <van-form @submit="handleSubmit" class="change-form">
          <!-- 旧密码 -->
          <div class="field-item">
            <label class="field-label" for="oldPassword">旧密码</label>
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <van-field
                id="oldPassword"
                v-model="password"
                name="oldPassword"
                type="password"
                class="glass-input"
                placeholder="输入旧密码"
                autocomplete="current-password"
                :rules="oldPwdRules"
              />
            </div>
          </div>

          <!-- 新密码 -->
          <div class="field-item">
            <label class="field-label" for="newPassword">新密码</label>
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <van-field
                id="newPassword"
                v-model="newPassword"
                name="newPassword"
                :type="passwordVisible1 ? 'text' : 'password'"
                class="glass-input pr-12"
                placeholder="至少 8 位字母+数字"
                autocomplete="new-password"
                :rules="newPwdRules"
              />
              <button type="button" class="toggle-visibility" @click="togglePasswordVisible(1)">
                <van-icon :name="passwordVisible1 ? 'eye-o' : 'closed-eye'" />
              </button>
            </div>
            <div class="field-hint">密码需为 8-16 位字母和数字组合</div>
          </div>

          <!-- 确认新密码 -->
          <div class="field-item">
            <label class="field-label" for="confirmPassword">确认新密码</label>
            <div class="input-wrapper">
              <van-icon name="lock" class="input-icon" />
              <van-field
                id="confirmPassword"
                v-model="confirmPassword"
                name="confirmPassword"
                :type="passwordVisible2 ? 'text' : 'password'"
                class="glass-input pr-12"
                placeholder="再次输入新密码"
                autocomplete="new-password"
                :rules="confirmRules"
              />
              <button type="button" class="toggle-visibility" @click="togglePasswordVisible(2)">
                <van-icon :name="passwordVisible2 ? 'eye-o' : 'closed-eye'" />
              </button>
            </div>
          </div>

          <!-- 修改按钮 -->
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="loading"
            loading-text="修改中..."
            class="submit-btn"
          >
            确认修改
          </van-button>

          <!-- 返回按钮 -->
          <div class="back-wrapper">
            <router-link to="/mine" class="back-link">
              <van-icon name="arrow-left" />
              返回个人中心
            </router-link>
          </div>
        </van-form>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.change-pwd-page {
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

.change-form {
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

.field-hint {
  font-size: 12px;
  color: rgba($text-secondary, 0.6);
  padding-left: $xs;
  margin-top: 2px;
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

// van-field 结构重置：清掉 vant 默认外观，玻璃样式由 .glass-input 控制（同 RegisterPage）
// 注意顺序：本块在前，.glass-input 在后，后者才能覆盖 border/padding
:deep(.van-field) {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  min-height: auto;
  .van-field__control {
    padding: 0;
    margin: 0;
    width: 100%;
  }
  .van-field__left-icon,
  .van-field__right-icon {
    display: none;
  }
}

// 聚焦态：van-field 的 focused class 落在根节点上（原生 input 的 :focus 不会触发）
:deep(.van-field--focused) {
  background: rgba(255, 255, 255, 0.5);
  border-color: $primary-color;
  box-shadow: 0 0 0 4px rgba(39, 174, 96, 0.1);
}

// 占位符在内部 control 上（根节点 ::placeholder 不生效）
:deep(.van-field__control)::placeholder {
  color: rgba($text-secondary, 0.6);
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
  transition: color 0.2s;

  &:hover {
    color: $primary-color;
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

.back-wrapper {
  display: flex;
  justify-content: center;
  margin-top: $md;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: $text-secondary;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: $primary-color;
  }

  .van-icon {
    font-size: 16px;
  }
}
</style>
