import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/index'

const routes = [
  {
    path: '/',
    redirect: '/home' // 根路径重定向到首页
  },
  {
    path: '/',
    component: () => import('@/views/layout/index.vue'),
    children: [
      {
        path: '/home',
        name: 'Home',
        component: () => import('@/views/layout/HomePage.vue'),
        meta: { title: '首页', showTabbar: true }
      },
      {
        path: 'category',
        name: 'Playlist',
        component: () => import('@/views/layout/PlaylistPage.vue'),
        meta: { title: '歌单', showTabbar: true }
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/views/layout/SearchPage.vue'),
        meta: { title: '搜索', showTabbar: true }
      },
      {
        path: 'mine',
        name: 'Mine',
        component: () => import('@/views/layout/MinePage.vue'),
        meta: { title: '我的', showTabbar: true, requiresAuth: true }
      }
    ]
  },
  {
    path: '/playlist/:category',
    name: 'PlaylistDetail',
    component: () => import('@/views/playlistDetail/PlaylistDetailPage.vue'),
    meta: { title: '歌单详情', showTabbar: false }
  },
  {
    path: '/play',
    name: 'Play',
    component: () => import('@/views/play/PlayPage.vue'),
    meta: { title: '播放', showTabbar: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginPage.vue'),
    meta: { title: '登录', showTabbar: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/register/RegisterPage.vue'),
    meta: { title: '注册', showTabbar: false }
  },
  {
    path: '/changePwd',
    name: 'ChangePwd',
    component: () => import('@/views/changePwd/ChangePwd.vue'),
    meta: { title: '修改密码', showTabbar: false, requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：检查需要登录的页面
router.beforeEach((to, from) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return '/login'
  }
})
export default router
