<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show'])
const router = useRouter()
const authStore = useAuthStore()

// 关闭抽屉
const close = () => {
  emit('update:show', false)
}

// 退出登录
const logout = () => {
  close()

  // 延迟执行退出登录，让抽屉关闭动画完成
  setTimeout(() => {
    authStore.logout()
    // 延迟显示通知，确保通知在正确的上下文显示
    setTimeout(() => {
      showToast({
        type: 'success',
        message: '已退出登录',
        duration: 1000
        // zIndex: 9999
      })
    }, 100)
  }, 300)
}

// 设置菜单分组
const accountMenus = [
  { icon: 'user-o', label: '个人资料设置', action: () => {} },
  {
    icon: 'shield-o',
    label: '账号与安全',
    action: () => {
      router.push('/changePwd')
      close()
    }
  }
]

const generalMenus = [
  { icon: 'bell-o', label: '通知设置', action: () => {} },
  { icon: 'filter-o', label: '音质与下载', action: () => {} },
  { icon: 'orders-o', label: '占用空间管理', action: () => {} }
]

const preferenceMenus = [
  { icon: 'label-o', label: '深色模式', type: 'toggle', value: ref(false) },
  { icon: 'globe-o', label: '多语言', value: '简体中文', action: () => {} }
]

const aboutMenus = [
  { icon: 'info-o', label: '关于 Music Player', action: () => {} },
  { icon: 'upgrade', label: '检查更新', hasDot: true, action: () => {} }
]
</script>

<template>
  <van-popup
    :show="show"
    position="right"
    :style="{ width: '85%', height: '100%' }"
    @click-overlay="close"
    @close="close"
    teleport="body"
  >
    <div class="settings-drawer">
      <!-- 头部 -->
      <div class="drawer-header">
        <button class="back-btn" @click="close">
          <van-icon name="arrow-left" size="22" />
        </button>
        <h2 class="drawer-title">设置</h2>
      </div>

      <!-- 滚动内容 -->
      <div class="drawer-content">
        <!-- 个人资料设置 -->
        <div class="menu-group">
          <h3 class="group-title">个人资料设置</h3>
          <div class="menu-items">
            <button
              v-for="item in accountMenus"
              :key="item.label"
              class="menu-item"
              @click="item.action"
            >
              <div class="menu-left">
                <van-icon :name="item.icon" size="20" class="menu-icon" />
                <span class="menu-label">{{ item.label }}</span>
              </div>
              <van-icon name="arrow" size="16" class="menu-arrow" />
            </button>
          </div>
        </div>

        <!-- 通用 -->
        <div class="menu-group">
          <h3 class="group-title">通用</h3>
          <div class="menu-items">
            <button
              v-for="item in generalMenus"
              :key="item.label"
              class="menu-item"
              @click="item.action"
            >
              <div class="menu-left">
                <van-icon :name="item.icon" size="20" class="menu-icon" />
                <span class="menu-label">{{ item.label }}</span>
              </div>
              <van-icon name="arrow" size="16" class="menu-arrow" />
            </button>
          </div>
        </div>

        <!-- 偏好设置 -->
        <div class="menu-group">
          <h3 class="group-title">偏好设置</h3>
          <div class="menu-items">
            <div
              v-for="item in preferenceMenus"
              :key="item.label"
              class="menu-item"
              @click="item.action?.()"
            >
              <div class="menu-left">
                <van-icon :name="item.icon" size="20" class="menu-icon" />
                <span class="menu-label">{{ item.label }}</span>
              </div>
              <div class="menu-right">
                <template v-if="item.type === 'toggle'">
                  <van-switch v-model="item.value.value" size="20" />
                </template>
                <template v-else-if="item.value">
                  <span class="value-text">{{ item.value }}</span>
                  <van-icon name="arrow" size="16" class="menu-arrow" />
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 关于 -->
        <div class="menu-group">
          <h3 class="group-title">关于</h3>
          <div class="menu-items">
            <button
              v-for="item in aboutMenus"
              :key="item.label"
              class="menu-item"
              @click="item.action"
            >
              <div class="menu-left">
                <van-icon :name="item.icon" size="20" class="menu-icon" />
                <span class="menu-label">{{ item.label }}</span>
              </div>
              <div class="menu-right">
                <span v-if="item.hasDot" class="update-dot" />
                <van-icon name="arrow" size="16" class="menu-arrow" />
              </div>
            </button>
          </div>
        </div>

        <!-- 退出登录 -->
        <button class="logout-btn" @click="logout">
          <van-icon name="revoke" size="20" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style lang="scss" scoped>
.settings-drawer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border-left: 1px solid rgba(255, 255, 255, 0.3);
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: $md;
  padding: $md $safe-margin;
  padding-top: calc($md + 12px);
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: $text-primary;
  transition: background 0.2s;

  &:active {
    background: rgba(0, 0, 0, 0.05);
  }
}

.drawer-title {
  font-size: 22px;
  font-weight: 700;
  color: $text-primary;
  margin: 0;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 $safe-margin $xl;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
}

.menu-group {
  margin-bottom: $lg;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: $primary-color;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 $xs;
  margin-bottom: $sm;
}

.menu-items {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px $md;
  border-radius: 12px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;

  &:active {
    background: rgba(0, 0, 0, 0.03);
  }
}

.menu-left {
  display: flex;
  align-items: center;
  gap: $md;
}

.menu-icon {
  color: $text-secondary;
}

.menu-label {
  font-size: 15px;
  font-weight: 500;
  color: $text-primary;
}

.menu-arrow {
  color: rgba($text-secondary, 0.4);
}

.menu-right {
  display: flex;
  align-items: center;
  gap: $xs;
}

.value-text {
  font-size: 12px;
  color: $text-secondary;
}

.update-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ba1a1a;
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $md;
  padding: 16px;
  border-radius: 24px;
  border: 2px solid rgba(186, 26, 26, 0.2);
  background: none;
  color: #ba1a1a;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: $xl;
  transition: all 0.2s;

  &:active {
    transform: scale(0.95);
    background: rgba(186, 26, 26, 0.05);
  }
}
</style>
