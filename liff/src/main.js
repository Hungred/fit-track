import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import { initLiff } from './lib/liff.js'
import { useUserStore } from './stores/user.js'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(ElementPlus, { locale: zhTw })
  app.use(router)

  // 先掛載 App，讓 loading 畫面可以顯示
  app.mount('#app')

  await initLiff()

  // LIFF init 完成後 URL params 才正確還原
  const store = useUserStore()
  const searchParams = new URLSearchParams(window.location.search)
  const gymId = searchParams.get('gym') || localStorage.getItem('gym_id')
  if (gymId) {
    store.setGym(gymId)
    await store.init()
    if (!store.initError) {
      const targetPath = window.location.pathname || '/'
      // 保留 query 參數（gym 已另外處理，移除避免重複）
      searchParams.delete('gym')
      const query = Object.fromEntries(searchParams)
      const noAuthPaths = ['/space-booking', '/group-classes', '/coach-bind']
      if (!store.member && !noAuthPaths.includes(targetPath)) {
        await router.push('/bind')
      } else {
        await router.push({ path: targetPath, query: Object.keys(query).length ? query : undefined })
      }
    }
  } else {
    store.loading = false
    store.initError = '缺少健身房資訊，請透過 LINE 選單開啟'
  }
}

bootstrap()
