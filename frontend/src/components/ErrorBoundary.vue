<script setup>
import { ref } from 'vue'
import { onErrorCaptured } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 组件级错误边界：隔离渲染错误，展示兜底 UI 并支持重试，避免整棵组件树崩溃。
const props = defineProps({
  fallbackText: { type: String, default: '页面出错了，点击重试' }
})

const hasError = ref(false)
const route = useRoute()
const router = useRouter()

onErrorCaptured((err) => {
  hasError.value = true
  console.error('[ErrorBoundary]', err)
  return false // 阻断继续冒泡到全局 errorHandler
})

const reload = () => {
  hasError.value = false
  router.replace(route.fullPath)
}
</script>

<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <van-empty description="页面出错了" />
    <van-button type="primary" size="small" round @click="reload">
      {{ props.fallbackText }}
    </van-button>
  </div>
</template>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 30vh;
}
</style>
