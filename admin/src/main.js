import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import './style.css'
import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from './stores/auth.js'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(ElementPlus, { locale: zhTw })
  app.use(router)
  app.mount('#app')

  const auth = useAuthStore()
  await auth.restore()
}

bootstrap()
