<script setup>
import { ref, onMounted, computed } from 'vue'
import { coachApi } from '../api/index.js'
import { ElMessage } from 'element-plus'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const members = ref([])
const loading = ref(true)
const todayLeaveIds = ref(new Set())

const todayCheckedIn = computed(() => members.value.filter(m => m.checked_in_today))
const todayLeaveCount = computed(() => todayLeaveIds.value.size)

async function fetchDashboard() {
  loading.value = true
  try {
    const [dashRes, leaveRes] = await Promise.all([
      coachApi.getDashboard(),
      coachApi.getTodayLeaves(),
    ])
    members.value = dashRes.data.members
    todayLeaveIds.value = new Set(leaveRes.data.leaves.map(l => l.member?.id))
  } catch (err) {
    if (err.response?.status !== 404) ElMessage.error('載入失敗')
    members.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">出勤總覽</h2>
        <p class="text-sm text-gray-400 mt-0.5">{{ dayjs().format('YYYY年MM月DD日') }}</p>
      </div>
    </div>

    <!-- 統計卡 -->
    <div class="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm text-gray-400">總學員數</p>
        <p class="text-3xl font-bold text-gray-800 mt-1">{{ members.length }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm text-gray-400">今日簽到</p>
        <p class="text-3xl font-bold text-green-600 mt-1">{{ todayCheckedIn.length }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm text-gray-400">今日請假</p>
        <p class="text-3xl font-bold text-orange-400 mt-1">{{ todayLeaveCount }}</p>
      </div>
    </div>

    <!-- 今日簽到名單 -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-5 py-3.5 border-b border-gray-50">
        <h3 class="text-sm font-semibold text-gray-700">今日簽到</h3>
      </div>
      <div v-if="loading" class="text-center py-10 text-gray-400 text-sm">載入中...</div>
      <div v-else-if="!todayCheckedIn.length" class="text-center py-10 text-gray-300 text-sm">今日尚無人簽到</div>
      <div v-else>
        <div
          v-for="m in todayCheckedIn"
          :key="m.id"
          class="flex items-center justify-between px-5 py-3 border-t border-gray-50 first:border-t-0"
        >
          <div>
            <p class="text-sm font-medium text-gray-800">{{ m.name }}</p>
            <p class="text-xs text-gray-400">{{ m.phone }}</p>
          </div>
          <span class="text-green-500 text-sm font-medium">✅ 已簽到</span>
        </div>
      </div>
    </div>
  </Layout>
</template>
