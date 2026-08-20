<script setup>
import { ref, computed, onMounted } from 'vue'
import { trialRequestApi } from '../api/index.js'
import { useAuthStore } from '../stores/auth.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const auth = useAuthStore()

const CONTACT_TIME_LABELS = {
  morning: '上午（09:00-12:00）',
  afternoon: '下午（12:00-18:00）',
  evening: '晚上（18:00-21:00）',
  anytime: '隨時皆可（文字訊息聯絡即可）',
}
const COACH_GENDER_LABELS = {
  female: '女教練',
  male: '男教練',
  either: '皆可 / 依時間安排為主',
}
const TRIAL_TIME_LABELS = {
  weekday_day: '平日白天',
  weekday_night: '平日晚上',
  weekend_day: '假日白天',
  weekend_night: '假日晚上',
  other: '其他特殊指定時間',
}
const STATUS_TABS = [
  { value: 'pending', label: '待聯繫' },
  { value: 'contacted', label: '已聯繫' },
  { value: 'closed', label: '已結案' },
]

function formatSlots(keys, labelMap) {
  return (keys || []).map(k => labelMap[k] || k).join('、')
}

const activeStatus = ref('pending')
const requests = ref([])
const loading = ref(false)
const exporting = ref(false)

async function fetchRequests() {
  loading.value = true
  try {
    const res = await trialRequestApi.list(activeStatus.value)
    requests.value = res.data.requests || []
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
  }
}

async function changeStatus(req, status) {
  try {
    await trialRequestApi.updateStatus(req.id, status)
    ElMessage.success('狀態已更新')
    await fetchRequests()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  }
}

async function removeRequest(req) {
  try {
    await ElMessageBox.confirm(`確定要刪除「${req.name}」的申請嗎？`, '確認刪除', { type: 'warning' })
    await trialRequestApi.delete(req.id)
    ElMessage.success('已刪除')
    await fetchRequests()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const res = await trialRequestApi.export()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `體驗課申請_${dayjs().format('YYYYMMDD')}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    ElMessage.error('匯出失敗')
  } finally {
    exporting.value = false
  }
}

const canManage = computed(() => auth.hasPermission('trials:manage'))

onMounted(fetchRequests)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">體驗課申請</h2>
      <el-button
        type="primary"
        :loading="exporting"
        @click="handleExport"
        style="background:#ea580c;border-color:#ea580c"
      >
        📊 匯出 Excel
      </el-button>
    </div>

    <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        @click="activeStatus = tab.value; fetchRequests()"
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeStatus === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >{{ tab.label }}</button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">載入中…</div>
    <div v-else-if="!requests.length" class="text-center py-12 text-gray-400 bg-white rounded-xl">
      目前沒有{{ STATUS_TABS.find(t => t.value === activeStatus)?.label }}的申請
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="req in requests" :key="req.id"
        class="bg-white rounded-xl p-5 shadow-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1.5 text-sm text-gray-600">
            <p class="font-semibold text-gray-800 text-base">{{ req.name }}
              <span class="font-normal text-gray-400 ml-2">{{ req.phone }}</span>
            </p>
            <p>📱 {{ req.contact_info }}</p>
            <p>🕐 方便聯繫時間：{{ formatSlots(req.contact_time_slots, CONTACT_TIME_LABELS) }}</p>
            <p>👤 偏好教練：{{ COACH_GENDER_LABELS[req.coach_gender_preference] || req.coach_gender_preference }}</p>
            <p>📅 期望體驗時間：{{ formatSlots(req.trial_time_slots, TRIAL_TIME_LABELS) }}</p>
            <p v-if="req.notes">📝 {{ req.notes }}</p>
            <p class="text-xs text-gray-300">申請於 {{ dayjs(req.created_at).format('MM/DD HH:mm') }}</p>
          </div>
          <div v-if="canManage" class="flex flex-col gap-2 shrink-0 w-28">
            <el-button
              v-if="req.status !== 'contacted'"
              size="small" type="primary" @click="changeStatus(req, 'contacted')"
              style="background:#2563eb;border-color:#2563eb;width:100%"
            >標記已聯繫</el-button>
            <el-button
              v-if="req.status !== 'closed'"
              size="small" @click="changeStatus(req, 'closed')"
              style="width:100%;margin-left:0"
            >標記已結案</el-button>
            <el-button
              v-if="req.status !== 'pending'"
              size="small" @click="changeStatus(req, 'pending')"
              style="width:100%;margin-left:0"
            >改回待聯繫</el-button>
            <el-button size="small" type="danger" plain @click="removeRequest(req)" style="width:100%;margin-left:0">刪除</el-button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
