<script setup>
import { ref, onMounted } from 'vue'
import { operatorApi } from '../api/index.js'
import { ElMessage } from 'element-plus'
import OperatorLayout from '../components/OperatorLayout.vue'
import dayjs from 'dayjs'

const logs = ref([])
const gyms = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const filterGymId = ref('')
const LIMIT = 50

const ACTION_CONFIG = {
  login:      { label: '登入',     bg: 'bg-gray-100',   text: 'text-gray-600' },
  gym_create: { label: '新增健身房', bg: 'bg-green-100',  text: 'text-green-700' },
  gym_update: { label: '更新設定',  bg: 'bg-blue-100',   text: 'text-blue-700' },
  gym_delete: { label: '刪除健身房', bg: 'bg-red-100',    text: 'text-red-600' },
}

function actionConfig(action) {
  return ACTION_CONFIG[action] || { label: action, bg: 'bg-gray-100', text: 'text-gray-600' }
}

function detailSummary(log) {
  if (log.action === 'login') return '營運方登入'
  if (log.action === 'gym_create') return `建立健身房${log.detail?.has_line_config ? '（已設定 LINE）' : ''}`
  if (log.action === 'gym_delete') return '健身房已刪除'
  if (log.action === 'gym_update') {
    const changed = log.detail?.changed || []
    if (!changed.length) return '無變更'
    return '更新：' + changed.map(c => c.field).join('、')
  }
  return ''
}

function changedItems(log) {
  if (log.action !== 'gym_update') return []
  return log.detail?.changed || []
}

async function fetchLogs(reset = false) {
  if (reset) {
    logs.value = []
    hasMore.value = true
  }
  if (!hasMore.value) return

  const isFirst = logs.value.length === 0
  if (isFirst) loading.value = true
  else loadingMore.value = true

  try {
    const params = { limit: LIMIT, offset: logs.value.length }
    if (filterGymId.value) params.gym_id = filterGymId.value

    const res = await operatorApi.getLogs(params)
    const newLogs = res.data.logs || []
    logs.value.push(...newLogs)
    if (newLogs.length < LIMIT) hasMore.value = false
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function fetchGyms() {
  try {
    const res = await operatorApi.listGyms()
    gyms.value = res.data.gyms || []
  } catch { }
}

function onFilterChange() {
  fetchLogs(true)
}

onMounted(() => {
  fetchGyms()
  fetchLogs()
})
</script>

<template>
  <OperatorLayout>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h2 class="text-xl font-bold text-gray-800">操作日誌</h2>
      <el-select
        v-model="filterGymId"
        placeholder="全部健身房"
        clearable
        style="width: 180px"
        @change="onFilterChange"
      >
        <el-option v-for="g in gyms" :key="g.id" :label="g.name" :value="g.id" />
      </el-select>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">載入中...</div>

    <template v-else>
      <div v-if="!logs.length" class="text-center py-16 text-gray-300">
        <p class="text-4xl mb-3">📋</p>
        <p class="text-sm">尚無操作記錄</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="log in logs"
          :key="log.id"
          class="bg-white rounded-xl px-4 py-3.5 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <span
                class="mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                :class="[actionConfig(log.action).bg, actionConfig(log.action).text]"
              >
                {{ actionConfig(log.action).label }}
              </span>
              <div class="min-w-0">
                <p v-if="log.gym_name" class="text-sm font-medium text-gray-800">{{ log.gym_name }}</p>
                <p class="text-sm text-gray-500 mt-0.5">{{ detailSummary(log) }}</p>

                <!-- gym_update 細項 -->
                <div v-if="changedItems(log).length" class="mt-2 space-y-1">
                  <div v-for="item in changedItems(log)" :key="item.field" class="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                    <span class="font-medium text-gray-500">{{ item.field }}：</span>
                    <template v-if="item.changed">
                      <span class="text-blue-500">已更新</span>
                    </template>
                    <template v-else>
                      <span class="text-red-400 line-through">{{ item.before || '（空）' }}</span>
                      <span>→</span>
                      <span class="text-green-600">{{ item.after || '（空）' }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0">
              {{ dayjs(log.created_at).format('MM/DD HH:mm') }}
            </span>
          </div>
        </div>

        <!-- 載入更多 -->
        <div class="text-center pt-2">
          <el-button
            v-if="hasMore"
            :loading="loadingMore"
            @click="fetchLogs()"
          >
            載入更多
          </el-button>
          <p v-else class="text-xs text-gray-300 py-2">已顯示全部記錄</p>
        </div>
      </div>
    </template>
  </OperatorLayout>
</template>
