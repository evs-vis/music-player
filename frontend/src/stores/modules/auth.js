import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePlayerStore } from './player'
import {
  userRegisterService,
  userLoginService,
  userChangePwdService
} from '@/api/auth'

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    const token = ref('')
    const user = ref(null)

    const isLoggedIn = computed(() => !!token.value)

    async function register(username, password) {
      return await userRegisterService(username, password)
    }

    async function changePwd(data) {
      return await userChangePwdService(data)
    }
    async function login(username, password) {
      const data = await userLoginService(username, password)
      // login 接口返回 { message, token, user: { id, username, avatar } }
      token.value = data.token || ''
      const u = data.user || {}
      user.value = {
        id: u.id,
        username: u.username,
        avatar: u.avatar || null
      }

      // 登录后尝试从 localStorage 加载该账号的播放器状态（按 userId 区分）
      try {
        const player = usePlayerStore()
        const uid = user.value?.id
        const key = uid ? `playerState_user_${uid}` : 'playerState_guest'
        const raw = localStorage.getItem(key)
        if (raw) {
          const playerState = JSON.parse(raw)
          player.playlist = Array.isArray(playerState.playlist)
            ? [...playerState.playlist]
            : []
          player.currentIndex = Number.isFinite(playerState.currentIndex)
            ? playerState.currentIndex
            : -1
          player.currentSong = player.playlist[player.currentIndex]
            ? { ...player.playlist[player.currentIndex] }
            : null
          player.currentTime =
            typeof playerState.currentTime === 'number'
              ? playerState.currentTime
              : 0
          // 如果之前是正在播放状态，浏览器可能阻止自动播放，
          // 所以标记为等待用户交互恢复播放并保持 isPlaying 为 false
          if (playerState.isPlaying) {
            player.setPlaying(false)
            if (player.setResumeOnGesture) player.setResumeOnGesture(true)
          } else {
            player.isPlaying = !!playerState.isPlaying
          }
        }
      } catch (e) {
        // ignore parse/error
      }

      return data
    }

    function updateAvatar(url) {
      if (user.value) {
        user.value.avatar = url
      }
    }
    function logout() {
      // 登出前将当前播放状态保存到 localStorage（按 userId）
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
      } catch (e) {
        // ignore
      }

      token.value = ''
      user.value = null
      // 退出账号时清理播放状态，避免播放与账号无关
      try {
        const player = usePlayerStore()
        player.setPlaying(false)
        player.clearPlaylist()
      } catch (e) {
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
      changePwd,
      updateAvatar
    }
  },
  {
    persist: { paths: ['token', 'user'] }
  }
)
