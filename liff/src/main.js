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

  await initLiff()
  const store = useUserStore()
  await store.init()

  app.mount('#app')
}

bootstrap()
