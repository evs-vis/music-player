import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from './player'
import {
  userRegisterService,
  userLoginService,
  userChangePwdService,
  deleteAccountService
} from '@/api/auth'

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    // ====== State ======
    const token = ref('')
    const user = ref(null)

    // ====== Getters ======
    const isLoggedIn = computed(() => !!token.value)

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

        // 4. 登录成功后恢复播放器状态
        try {
          const player = usePlayerStore()
          const uid = user.value?.id
          const key = uid ? `playerState_user_${uid}` : 'playerState_guest'
          const raw = localStorage.getItem(key)

          if (raw) {
            const playerState = JSON.parse(raw)
            player.playlist = Array.isArray(playerState.playlist) ? [...playerState.playlist] : []
            player.currentIndex = Number.isFinite(playerState.currentIndex)
              ? playerState.currentIndex
              : -1
            player.currentSong = player.playlist[player.currentIndex]
              ? { ...player.playlist[player.currentIndex] }
              : null

            const restoredTime =
              typeof playerState.currentTime === 'number' ? playerState.currentTime : 0
            player.currentTime = restoredTime

            if (restoredTime > 0) {
              player.seekTime = restoredTime
            }

            if (playerState.isPlaying) {
              player.setPlaying(false)
              if (player.setResumeOnGesture) player.setResumeOnGesture(true)
            } else {
              player.isPlaying = !!playerState.isPlaying
            }
          }
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
      }
    }

    // 登出
    function logout() {
      // 1. 保存当前播放状态到 localStorage
      try {
        const player = usePlayerStore()
        const uid = user.value?.id
        const key = uid ? `playerState_user_${uid}` : 'playerState_guest'
        const state = {
          playlist: player.playlist,
          currentIndex: player.currentIndex,
          currentTime: player.currentTime,
          isPlaying: player.isPlaying
        }
        localStorage.setItem(key, JSON.stringify(state))
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
      try {
        if (uid) localStorage.removeItem(`playerState_user_${uid}`)
      } catch {
        // ignore
      }
    }

    return {
      token,
      user,
      isLoggedIn,
      register,
      login,
      logout,
      deleteAccount,
      changePwd,
      updateAvatar
    }
  },
  // 持久化配置
  {
    persist: { paths: ['token', 'user'] }
  }
)
