import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', component: () => import('../pages/LoginPage.vue') },
  { path: '/', component: () => import('../pages/DashboardPage.vue') },
  { path: '/members/:id', component: () => import('../pages/MemberDetailPage.vue') },
  { path: '/packages', component: () => import('../pages/PackagesPage.vue') },
  { path: '/qr', component: () => import('../pages/QRPage.vue') },
  { path: '/report', component: () => import('../pages/ReportPage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!auth.isAuth && to.path !== '/login') return '/login'
  if (auth.isAuth && to.path === '/login') return '/'
})

export default router
