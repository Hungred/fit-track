<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { operatorApi } from '../api/index.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const password = ref('')
const loading = ref(false)

function setFavicon(svgHref, pngHref) {
  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove())
  const ts = Date.now()
  ;[
    { rel: 'shortcut icon', type: 'image/png', href: pngHref + '?v=' + ts },
    { rel: 'icon', type: 'image/png', href: pngHref + '?v=' + ts },
    { rel: 'icon', type: 'image/svg+xml', href: svgHref + '?v=' + ts },
  ].forEach(attrs => {
    const el = document.createElement('link')
    Object.assign(el, attrs)
    document.head.appendChild(el)
  })
}

const manifestLink = document.querySelector('link[rel="manifest"]')
const touchIconLink = document.querySelector('link[rel="apple-touch-icon"]')
const prevTitle = document.title

onMounted(() => {
  setFavicon('/favicon-operator.svg', '/icon-operator-192.png')
  if (manifestLink) manifestLink.href = '/manifest-operator.json'
  if (touchIconLink) touchIconLink.href = '/apple-touch-icon-operator.png'
  document.title = 'Fit Track 營運後台'
})
onUnmounted(() => {
  setFavicon('/favicon.svg', '/icon-192.png')
  if (manifestLink) manifestLink.href = '/manifest.json'
  if (touchIconLink) touchIconLink.href = '/apple-touch-icon.png'
  document.title = prevTitle
})

async function handleLogin() {
  if (!password.value) { ElMessage.warning('請輸入密碼'); return }
  loading.value = true
  try {
    await operatorApi.login(password.value)
    localStorage.setItem('operator_password', password.value)
    router.push('/operator')
  } catch {
    ElMessage.error('密碼錯誤')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">📓</div>
        <h1 class="text-2xl font-bold text-gray-800">Fit Track 營運後台</h1>
        <p class="text-gray-400 text-sm mt-2">請輸入營運方密碼</p>
      </div>
      <div class="space-y-4">
        <el-input v-model="password" type="password" placeholder="營運方密碼" size="large" @keyup.enter="handleLogin" />
        <el-button type="primary" size="large" class="w-full" :loading="loading" @click="handleLogin"
          style="background:#2563eb;border-color:#2563eb">
          登入
        </el-button>
      </div>
    </div>
  </div>
</template>
