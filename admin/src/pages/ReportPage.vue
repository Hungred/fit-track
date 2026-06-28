<script setup>
import { ref, onMounted, computed } from 'vue'
import { coachApi } from '../api/index.js'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const month = ref(dayjs().format('YYYY-MM'))
const report = ref(null)
const loading = ref(false)
const errorMsg = ref('')
const selectedDate = ref(null)

async function fetchReport() {
  loading.value = true
  errorMsg.value = ''
  selectedDate.value = null
  try {
    const res = await coachApi.getReport(month.value)
    report.value = res.data
  } catch (err) {
    report.value = null
    errorMsg.value = err.response?.data?.error || err.message || '載入失敗'
  } finally {
    loading.value = false
  }
}

// { 'YYYY-MM-DD': [{ id, name }, ...] }
const dailyMap = computed(() => {
  if (!report.value) return {}
  const map = {}
  for (const member of report.value.breakdown) {
    for (const date of member.dates) {
      if (!map[date]) map[date] = []
      map[date].push({ id: member.id, name: member.name })
    }
  }
  return map
})

const calendarCells = computed(() => {
  const first = dayjs(`${month.value}-01`)
  const startDow = first.day()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= first.daysInMonth(); d++) cells.push(d)
  return cells
})

const selectedDayMembers = computed(() =>
  selectedDate.value ? (dailyMap.value[selectedDate.value] || []) : []
)

function selectDay(day) {
  if (!day) return
  const dateStr = `${month.value}-${String(day).padStart(2, '0')}`
  selectedDate.value = selectedDate.value === dateStr ? null : dateStr
}

function dateStr(day) {
  return `${month.value}-${String(day).padStart(2, '0')}`
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const today = dayjs().format('YYYY-MM-DD')

onMounted(fetchReport)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">月報表</h2>
      <el-input v-model="month" type="month" style="width: 160px" @change="fetchReport" />
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">載入中...</div>

    <div v-else-if="errorMsg" class="text-center py-16 text-red-400">
      {{ errorMsg }}
      <br />
      <el-button class="mt-4" @click="fetchReport">重試</el-button>
    </div>

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

      <!-- 月曆 + 明細 -->
      <div class="grid grid-cols-5 gap-6">
        <!-- 月曆 -->
        <div class="col-span-3 bg-white rounded-2xl shadow-sm p-5">
          <div class="grid grid-cols-7 mb-2">
            <div v-for="w in weekdays" :key="w"
              class="text-center text-xs text-gray-400 font-medium py-1">
              {{ w }}
            </div>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <div v-for="(day, i) in calendarCells" :key="i">
              <div v-if="day"
                @click="selectDay(day)"
                class="aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-colors"
                :class="selectedDate === dateStr(day)
                  ? 'bg-green-500 text-white'
                  : today === dateStr(day)
                    ? 'ring-2 ring-green-300 hover:bg-gray-50'
                    : 'hover:bg-gray-50'"
              >
                <span class="text-sm font-medium leading-none">{{ day }}</span>
                <span v-if="dailyMap[dateStr(day)]?.length"
                  class="text-xs font-bold mt-1 leading-none"
                  :class="selectedDate === dateStr(day) ? 'text-white' : 'text-green-500'">
                  {{ dailyMap[dateStr(day)].length }}
                </span>
              </div>
              <div v-else />
            </div>
          </div>
        </div>

        <!-- 出勤明細 -->
        <div class="col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <div v-if="!selectedDate"
            class="h-full flex flex-col items-center justify-center text-gray-300 py-12">
            <div class="text-4xl mb-3">👆</div>
            <p class="text-sm">點選日期查看出勤明細</p>
          </div>
          <template v-else>
            <h3 class="font-semibold text-gray-700 mb-4">
              {{ dayjs(selectedDate).format('MM / DD') }}
              <span class="text-green-500 ml-1 text-sm font-normal">{{ selectedDayMembers.length }} 人出勤</span>
            </h3>
            <div v-if="!selectedDayMembers.length" class="text-center py-8 text-gray-300 text-sm">
              當日無出勤記錄
            </div>
            <div v-else class="space-y-2">
              <div v-for="(m, idx) in selectedDayMembers" :key="m.id"
                class="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                <span class="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {{ idx + 1 }}
                </span>
                <span class="text-sm font-medium text-gray-800">{{ m.name }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </Layout>
</template>
