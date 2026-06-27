<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { memberApi } from '../api/index.js'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'
import localizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(localizedFormat)
dayjs.locale('zh-tw')

const router = useRouter()
const checkins = ref([])
const loading = ref(true)
const selectedMonth = ref(dayjs().format('YYYY-MM'))

async function fetchHistory() {
  loading.value = true
  try {
    const res = await memberApi.getCheckinHistory(selectedMonth.value)
    checkins.value = res.data.checkins
  } finally {
    loading.value = false
  }
}

const methodLabel = { button: '按鈕簽到', qr: 'QR 掃描', manual: '教練補登' }

onMounted(fetchHistory)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 pt-10 pb-5 flex items-center gap-3">
      <button @click="router.back()" class="text-white/80 hover:text-white">
        ←
      </button>
      <h1 class="text-lg font-bold">出勤記錄</h1>
    </div>

    <div class="px-4 py-4">
      <!-- 月份選擇 -->
      <div class="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3">
        <span class="text-sm text-gray-500">月份</span>
        <input
          v-model="selectedMonth"
          type="month"
          class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
          @change="fetchHistory"
        />
        <span class="text-sm font-semibold text-green-600">{{ checkins.length }} 次</span>
      </div>

      <!-- 記錄列表 -->
      <div v-if="loading" class="text-center py-12 text-gray-400">載入中...</div>

      <div v-else-if="!checkins.length" class="text-center py-12">
        <div class="text-4xl mb-3">📅</div>
        <p class="text-gray-400">本月尚無出勤記錄</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in checkins"
          :key="item.id"
          class="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-lg">
              ✅
            </div>
            <div>
              <p class="font-medium text-gray-800">
                {{ dayjs(item.checked_in_at).format('MM/DD (ddd)') }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ dayjs(item.checked_in_at).format('HH:mm') }} ・ {{ methodLabel[item.method] }}
              </p>
            </div>
          </div>
          <span class="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full font-medium">
            {{ item.member_package?.package?.name }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
