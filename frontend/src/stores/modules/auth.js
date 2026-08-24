import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import defaultAvatar from '@/assets/avatar.webp'
import { compressImageFile } from '@/utils/image'
import { usePlayerStore } from './player'
import {
  userRegisterService,
  userLoginService,
  userChangePwdService,
  deleteAccountService,
  uploadAvatarService
} from '@/api/auth'

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    // ====== State ======
    const token = ref('')
    const user = ref(null)

    // 头像版本号：每次换头像 +1。后端头像文件名固定为 `/avatars/{userId}{ext}`，
    // 多次上传 URL 不变 → 浏览器命中缓存不重新拉取 → 头像不回显；getter 里拼 ?v=N 破坏缓存
    const avatarVersion = ref(0)

    // 头像上传限频：冷却期内不允许再次上传，防止快速连换头像
    const AVATAR_UPLOAD_COOLDOWN = 3000 // ms
    const uploading = ref(false)
    const lastUploadAt = ref(0)

    // ====== Getters ======
    const isLoggedIn = computed(() => !!token.value)
    // 头像地址（数据层派生：自定义头像拼 baseURL，否则用默认头像；页面直接消费）
    const avatarSrc = computed(() => {
      if (!user.value?.avatar) return defaultAvatar
      const baseURL = import.meta.env.VITE_API_BASE_URL || ''
      const url = baseURL + user.value.avatar
      return avatarVersion.value ? `${url}?v=${avatarVersion.value}` : url
    })
    // 当前是否允许发起头像上传（正在上传或仍在冷却期内则不允许）。
    // 必须用函数而非 computed：computed 只在响应式依赖变化时重算，时间流逝不会触发重算，
    // 会导致"等再久都还是冷却中"；函数在每次点击时实时判断时间。
    function canUpload() {
      return !uploading.value && Date.now() - lastUploadAt.value >= AVATAR_UPLOAD_COOLDOWN
    }

    // ====== Actions ======

    // 注册
    async function register(username, password) {
      if (!username?.trim() || !password) {
        const err = new Error('账号或密码不能为空')
        err.code = 'VALIDATION_ERROR'
        throw err
      }
      try {
        const res = await userRegisterService(username, password)
        return res
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || '网络异常'
        const stdErr = new Error(msg)
        stdErr.code = 'HTTP_ERROR'
        throw stdErr
      }
    }

    // 修改密码
    async function changePwd(data) {
      return await userChangePwdService(data)
    }

    // 登录（核心逻辑）
    async function login(username, password) {
      // 1. 参数校验（防御性）
      if (!username?.trim() || !password) {
        const err = new Error('账号或密码不能为空')
        err.code = 'VALIDATION_ERROR'
        throw err
      }

      try {
        // 2. 调用登录 API
        const res = await userLoginService(username, password)

        // 3. 保存登录态
        token.value = res.token || ''
        const u = res.user || {}
        user.value = {
          id: u.id,
          username: u.username,
          avatar: u.avatar || null
        }

        // 4. 登录成功后恢复播放器状态（快照逻辑在 player store 内收口）
        try {
          usePlayerStore().restorePlayerSnapshot(user.value?.id)
        } catch {
          // 播放器恢复失败不影响登录流程
        }

        // 5. 返回登录结果
        return res
      } catch (err) {
        // 6. 错误标准化
        const msg = err?.response?.data?.error || err?.message || '网络异常'
        const stdErr = new Error(msg)
        stdErr.code = 'HTTP_ERROR'
        stdErr.original = err
        throw stdErr
      }
    }

    // 更新头像
    function updateAvatar(url) {
      if (user.value) {
        user.value.avatar = url
        avatarVersion.value++ // 换头像 → 版本号 +1 → avatarSrc 变化 → 图片强制重新加载
      }
    }

    // 上传头像（数据层：限频 + 调接口 + 更新 store 头像路径；UI 提示由页面负责）
    async function uploadAvatar(file) {
      if (uploading.value) {
        const err = new Error('头像上传中，请稍候')
        err.code = 'UPLOADING'
        throw err
      }
      if (Date.now() - lastUploadAt.value < AVATAR_UPLOAD_COOLDOWN) {
        const err = new Error('操作太频繁，请稍后再试')
        err.code = 'TOO_FREQUENT'
        throw err
      }
      uploading.value = true
      try {
        // 上传前压缩：原图缩放至 ≤256px 并转 WebP，头像体积约 100KB → 10KB（压缩失败回退原文件）
        const uploadFile = await compressImageFile(file)
        const res = await uploadAvatarService(uploadFile)
        updateAvatar(res.avatar)
        lastUploadAt.value = Date.now()
        return res
      } finally {
        uploading.value = false
      }
    }

    // 登出
    function logout() {
      // 1. 保存当前播放状态到 localStorage（uid 需在清空登录态前取）
      try {
        usePlayerStore().savePlayerSnapshot(user.value?.id)
      } catch {
        // ignore
      }

      // 2. 清空登录态
      token.value = ''
      user.value = null

      // 3. 清空播放器
      try {
        const player = usePlayerStore()
        player.setPlaying(false)
        player.clearPlaylist()
      } catch {
        // ignore
      }
    }

    // 注销账号
    async function deleteAccount() {
      const uid = user.value?.id
      await deleteAccountService()
      logout()
      // 注销后清除该用户残留的播放器快照
      try {
        if (uid) usePlayerStore().removePlayerSnapshot(uid)
      } catch {
        // ignore
      }
    }

    return {
      token,
      user,
      isLoggedIn,
      avatarSrc,
      canUpload,
      register,
      login,
      logout,
      deleteAccount,
      changePwd,
      updateAvatar,
      uploadAvatar
    }
  },
  // 持久化配置
  {
    persist: { paths: ['token', 'user', 'avatarVersion'] }
  }
)
