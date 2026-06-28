<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { checkinApi } from '../api/index.js'
import { ElMessage } from 'element-plus'

const store = useUserStore()
const router = useRouter()
const route = useRoute()
const checkingIn = ref(false)

const totalSessions = () => store.packages.reduce((sum, p) => sum + p.remaining_sessions, 0)

async function handleCheckin(method = 'button', token = null) {
  checkingIn.value = true
  try {
    const res = await checkinApi.checkin(method, token)
    ElMessage.success(res.data.message)
    await store.init()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '簽到失敗')
  } finally {
    checkingIn.value = false
  }
}

onMounted(() => {
  const token = route.query.token
  if (token) handleCheckin('qr', token)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 pt-10 pb-16">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm">你好 👋</p>
          <h1 class="text-xl font-bold mt-0.5">{{ store.member?.name }}</h1>
        </div>
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
          💪
        </div>
      </div>
    </div>

    <!-- Main Card -->
    <div class="px-4 -mt-8">
      <!-- 堂數卡片 -->
      <div class="bg-white rounded-2xl shadow-md p-6 mb-4">
        <p class="text-gray-500 text-sm mb-1">目前剩餘堂數</p>
        <div class="flex items-end gap-2">
          <span class="text-5xl font-bold text-green-600">{{ totalSessions() }}</span>
          <span class="text-gray-400 mb-2">堂</span>
        </div>

        <!-- 各方案列表 -->
        <div v-if="store.packages.length" class="mt-4 space-y-2">
          <div
            v-for="pkg in store.packages"
            :key="pkg.id"
            class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5"
          >
            <span class="text-sm text-gray-600">{{ pkg.package?.name }}</span>
            <span class="text-sm font-semibold text-green-600">{{ pkg.remaining_sessions }} 堂</span>
          </div>
        </div>
        <div v-else class="mt-4 text-center text-gray-400 text-sm py-2">
          目前沒有有效方案，請聯絡教練購課
        </div>
      </div>

      <!-- 簽到按鈕 -->
      <button
        @click="handleCheckin"
        :disabled="checkingIn || !store.packages.length"
        class="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-2xl shadow-md transition-all duration-150 active:scale-95"
      >
        <span v-if="checkingIn">簽到中...</span>
        <span v-else>✅ 立即簽到</span>
      </button>

      <!-- 查看記錄 -->
      <button
        @click="router.push('/history')"
        class="w-full mt-3 bg-white text-gray-600 font-medium py-4 rounded-2xl shadow-sm border border-gray-100 transition-all hover:bg-gray-50"
      >
        📋 查看出勤記錄
      </button>
    </div>
  </div>
</template>
