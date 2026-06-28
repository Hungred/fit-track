<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import QRCode from 'qrcode'
import { coachApi } from '../api/index.js'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const qrDataUrl = ref('')
const expiresAt = ref(null)
const countdown = ref(0)
const loading = ref(false)
let timer = null

async function refresh() {
  loading.value = true
  try {
    const res = await coachApi.generateQrToken()
    const { qr_url, expires_at } = res.data
    qrDataUrl.value = await QRCode.toDataURL(qr_url, { width: 280, margin: 2 })
    expiresAt.value = expires_at
    startCountdown(expires_at)
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function startCountdown(expiresIso) {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    const diff = Math.max(0, Math.floor((new Date(expiresIso) - Date.now()) / 1000))
    countdown.value = diff
    if (diff === 0) refresh()
  }, 1000)
}

const countdownText = () => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

onMounted(refresh)
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <Layout>
    <div class="max-w-sm mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800">QR Code 簽到</h2>
        <el-button size="small" @click="refresh" :loading="loading">重新產生</el-button>
      </div>

      <div class="bg-white rounded-2xl shadow-md p-8 text-center">
        <div v-if="loading" class="py-16 text-gray-400">產生中...</div>

        <template v-else-if="qrDataUrl">
          <img :src="qrDataUrl" alt="QR Code" class="mx-auto rounded-xl" />

          <div class="mt-6 space-y-2">
            <p class="text-sm text-gray-500">請學員用 LINE 掃描此 QR Code 完成簽到</p>
            <div class="flex items-center justify-center gap-2 mt-3">
              <span
                class="text-2xl font-mono font-bold"
                :class="countdown <= 60 ? 'text-red-500' : 'text-green-600'"
              >
                {{ countdownText() }}
              </span>
              <span class="text-sm text-gray-400">後到期</span>
            </div>
            <p class="text-xs text-gray-400">到期後自動更新</p>
          </div>
        </template>
      </div>

      <div class="mt-4 bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
        每個 QR Code 有效期 10 分鐘，每位學員只能掃一次（當天限簽一次）
      </div>
    </div>
  </Layout>
</template>
