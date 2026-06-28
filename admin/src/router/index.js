import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', component: () => import('../pages/LoginPage.vue') },
  { path: '/', component: () => import('../pages/DashboardPage.vue') },
  { path: '/members/:id', component: () => import('../pages/MemberDetailPage.vue') },
  { path: '/packages', component: () => import('../pages/PackagesPage.vue') },
  { path: '/qr', component: () => import('../pages/QRPage.vue') },
  { path: '/report', component: () => import('../pages/ReportPage.vue') },
  { path: '/operator/login', component: () => import('../pages/OperatorLoginPage.vue') },
  { path: '/operator', component: () => import('../pages/OperatorPage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const operatorPaths = ['/operator', '/operator/login']

router.beforeEach((to) => {
  if (operatorPaths.some(p => to.path.startsWith(p))) return
  const auth = useAuthStore()
  if (!auth.isAuth && to.path !== '/login') return '/login'
  if (auth.isAuth && to.path === '/login') return '/'
})

export default router
