import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  { path: '/', component: () => import('../pages/HomePage.vue') },
  { path: '/bind', component: () => import('../pages/BindPage.vue') },
  { path: '/history', component: () => import('../pages/HistoryPage.vue') },
  { path: '/classes', component: () => import('../pages/ClassesPage.vue') },
  { path: '/space-booking', component: () => import('../pages/SpaceBookingPage.vue') },
  { path: '/leave', component: () => import('../pages/LeavePage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const store = useUserStore()

  // 初始化中或有錯誤時不做跳轉，由 App.vue 顯示對應畫面
  if (store.loading || store.initError) return

  if (!store.member && to.path !== '/bind' && to.path !== '/space-booking') {
    return '/bind'
  }
  if (store.member && to.path === '/bind') {
    return '/'
  }
})

export default router
