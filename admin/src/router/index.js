import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', component: () => import('../pages/LoginPage.vue') },
  { path: '/', component: () => import('../pages/DashboardPage.vue') },
  { path: '/members', component: () => import('../pages/MembersPage.vue'), meta: { permission: 'members:list' } },
  { path: '/members/:id', component: () => import('../pages/MemberDetailPage.vue'), meta: { permission: 'members:view' } },
  { path: '/packages', component: () => import('../pages/PackagesPage.vue'), meta: { permission: 'packages:list' } },
  { path: '/qr', component: () => import('../pages/QRPage.vue'), meta: { permission: 'qr:generate' } },
  { path: '/report', component: () => import('../pages/ReportPage.vue'), meta: { permission: 'report:view' } },
  { path: '/classes', component: () => import('../pages/ClassesPage.vue'), meta: { permission: 'classes:view' } },
  { path: '/coaches', component: () => import('../pages/CoachesPage.vue'), meta: { permission: 'coaches:list' } },
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
  if (to.query.gym) auth.setGym(to.query.gym)

  if (!auth.isAuth && to.path !== '/login') return '/login'
  if (auth.isAuth && to.path === '/login') return '/'

  const permission = to.meta?.permission
  if (permission && !auth.hasPermission(permission)) return '/'
})

export default router
