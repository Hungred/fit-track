import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  { path: '/', component: () => import('../pages/HomePage.vue') },
  { path: '/bind', component: () => import('../pages/BindPage.vue') },
  { path: '/history', component: () => import('../pages/HistoryPage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const store = useUserStore()
  if (!store.member && to.path !== '/bind') {
    return '/bind'
  }
  if (store.member && to.path === '/bind') {
    return '/'
  }
})

export default router
