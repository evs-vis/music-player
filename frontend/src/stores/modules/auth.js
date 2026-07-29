import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userRegisterService, userLoginService } from '@/api/auth'

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    const token = ref('')
    const user = ref(null)

    const isLoggedIn = computed(() => !!token.value)

    async function register(username, password) {
      return await userRegisterService(username, password)
    }

    async function login(username, password) {
      const data = await userLoginService(username, password)
      token.value = data.token || ''
      user.value = data.user || null
      return data
    }

    function logout() {
      token.value = ''
      user.value = null
    }

    return {
      token,
      user,
      isLoggedIn,
      register,
      login,
      logout
    }
  },
  {
    persist: { paths: ['token', 'user'] }
  }
)
