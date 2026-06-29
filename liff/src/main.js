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
  const params = new URLSearchParams(window.location.search)
  const gymId = params.get('gym') || localStorage.getItem('gym_id')
  if (gymId) {
    store.setGym(gymId)
    await store.init()
    if (!store.initError) {
      const currentPath = window.location.pathname
      const isKnownPath = ['/', '/bind', '/history', '/classes'].includes(currentPath)
      if (!store.member) {
        await router.push('/bind')
      } else if (!isKnownPath || currentPath === '/') {
        await router.push('/')
      }
      // 有明確路徑（如 /classes）則讓 router 自己處理，不強制跳轉
    }
  } else {
    store.loading = false
    store.initError = '缺少健身房資訊，請透過 LINE 選單開啟'
  }
}

bootstrap()
