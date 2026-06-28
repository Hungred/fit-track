<script setup>
import { ref, onMounted } from 'vue'
import { coachApi } from '../api/index.js'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const month = ref(dayjs().format('YYYY-MM'))
const report = ref(null)
const loading = ref(false)

async function fetchReport() {
  loading.value = true
  try {
    const res = await coachApi.getReport(month.value)
    report.value = res.data
  } catch {
    report.value = null
  } finally {
    loading.value = false
  }
}

function methodLabel(method) {
  return { button: '按鈕', qr: 'QR', manual: '補登' }[method] || method
}

onMounted(fetchReport)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">月報表</h2>
      <div class="flex items-center gap-3">
        <el-input
          v-model="month"
          type="month"
          style="width: 160px"
          @change="fetchReport"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">載入中...</div>

    <template v-else-if="report">
      <!-- 統計卡片 -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p class="text-sm text-gray-400 mb-1">總出勤次數</p>
          <p class="text-4xl font-bold text-green-600">{{ report.total_checkins }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p class="text-sm text-gray-400 mb-1">出勤人數</p>
          <p class="text-4xl font-bold text-blue-500">{{ report.unique_members }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p class="text-sm text-gray-400 mb-1">平均每人</p>
          <p class="text-4xl font-bold text-purple-500">
            {{ report.unique_members ? (report.total_checkins / report.unique_members).toFixed(1) : 0 }}
          </p>
          <p class="text-xs text-gray-400 mt-1">堂</p>
        </div>
      </div>

      <!-- 學員明細 -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-700">學員出勤明細</h3>
        </div>

        <div v-if="!report.breakdown.length" class="text-center py-12 text-gray-400">
          本月尚無出勤記錄
        </div>

        <div
          v-for="(m, index) in report.breakdown"
          :key="m.id"
          class="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <span class="w-7 h-7 rounded-full bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center">
              {{ index + 1 }}
            </span>
            <div>
              <p class="font-medium text-gray-800">{{ m.name }}</p>
              <div class="flex gap-2 mt-0.5">
                <span
                  v-for="(cnt, method) in m.methods"
                  :key="method"
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="{
                    'bg-green-50 text-green-600': method === 'button',
                    'bg-blue-50 text-blue-600': method === 'qr',
                    'bg-yellow-50 text-yellow-600': method === 'manual',
                  }"
                >
                  {{ methodLabel(method) }} {{ cnt }}
                </span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-green-600">{{ m.count }}</p>
            <p class="text-xs text-gray-400">堂</p>
          </div>
        </div>
      </div>
    </template>
  </Layout>
</template>
