<script setup>
import { ref, onMounted } from 'vue'
import liff from '@line/liff'
import { coachBindApi } from '../api/index.js'

const status = ref('loading')
const errorMsg = ref('')

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      errorMsg.value = '連結格式錯誤，缺少 token。'
      status.value = 'error'
      return
    }

    const profile = await liff.getProfile()
    await coachBindApi.bind(token, profile.userId)
    status.value = 'success'
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '綁定失敗，請稍後再試或請管理員重新產生連結。'
    status.value = 'error'
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">

    <div v-if="status === 'loading'" class="text-gray-400">
      <div class="text-4xl mb-4">⏳</div>
      <p class="text-sm">綁定中，請稍候…</p>
    </div>

    <div v-else-if="status === 'success'">
      <div class="text-5xl mb-5">✅</div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">LINE 帳號綁定成功！</h2>
      <p class="text-gray-500 text-sm">之後課程通知、學員互動訊息都會推播到你的 LINE。</p>
    </div>

    <div v-else>
      <div class="text-5xl mb-5">❌</div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">綁定失敗</h2>
      <p class="text-gray-500 text-sm">{{ errorMsg }}</p>
    </div>

  </div>
</template>
