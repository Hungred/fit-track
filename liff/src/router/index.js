import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  { path: '/', component: () => import('../pages/HomePage.vue') },
  { path: '/bind', component: () => import('../pages/BindPage.vue') },
  { path: '/history', component: () => import('../pages/HistoryPage.vue') },
  { path: '/classes', component: () => import('../pages/ClassesPage.vue') },
  { path: '/space-booking', component: () => import('../pages/SpaceBookingPage.vue') },
  { path: '/leave', component: () => import('../pages/LeavePage.vue') },
  { path: '/group-classes', component: () => import('../pages/GroupClassesPage.vue') },
  { path: '/private-lessons', component: () => import('../pages/PrivateLessonsPage.vue') },
  { path: '/coach-bind', component: () => import('../pages/CoachBindPage.vue') },
  { path: '/trial-request', component: () => import('../pages/TrialRequestPage.vue') },
  { path: '/facility', component: () => import('../pages/FacilityPage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const store = useUserStore()

  // 初始化中或有錯誤時不做跳轉，由 App.vue 顯示對應畫面
  if (store.loading || store.initError) return

  const unboundAllowed = ['/bind', '/space-booking', '/group-classes', '/coach-bind', '/trial-request', '/facility']
  if (!store.member && !unboundAllowed.includes(to.path)) {
    return '/bind'
  }
  if (store.member && to.path === '/bind') {
    return '/'
  }
})

export default router
