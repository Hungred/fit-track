<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { leaveApi } from '../api/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const store = useUserStore()
const leaves = ref([])
const loading = ref(true)
const submitting = ref(false)
const showForm = ref(false)

const today = dayjs().format('YYYY-MM-DD')
const form = ref({ date: today, reason: '' })

async function load() {
  loading.value = true
  try {
    const res = await leaveApi.getMyLeaves()
    leaves.value = (res.data.leaves || []).sort((a, b) => a.leave_date < b.leave_date ? 1 : -1)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.date) { ElMessage.warning('請選擇請假日期'); return }
  submitting.value = true
  try {
    await leaveApi.requestLeave(form.value.date, form.value.reason)
    ElMessage.success('請假成功')
    form.value = { date: today, reason: '' }
    showForm.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '請假失敗')
  } finally {
    submitting.value = false
  }
}

async function cancel(leave) {
  try {
    await ElMessageBox.confirm(`確定取消 ${leave.leave_date} 的請假？`, '取消請假', { type: 'warning', confirmButtonText: '確定', cancelButtonText: '返回' })
    await leaveApi.cancelLeave(leave.leave_date)
    ElMessage.success('已取消請假')
    await load()
  } catch {}
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100 px-4 flex items-center gap-3"
      style="height: calc(3.5rem + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top)">
      <div class="text-2xl">🏖️</div>
      <div>
        <h1 class="font-bold text-gray-800 text-base leading-tight">請假申請</h1>
        <p class="text-xs text-gray-400">{{ store.member?.name }}</p>
      </div>
    </header>

    <div class="p-4 space-y-4 max-w-lg mx-auto" style="padding-top: 1rem">

      <!-- 新增請假按鈕 -->
      <button
        @click="showForm = !showForm"
        class="w-full py-4 rounded-2xl font-semibold text-white transition-colors"
        :class="showForm ? 'bg-gray-400' : 'bg-orange-400 active:bg-orange-500'"
      >
        {{ showForm ? '取消' : '＋ 申請請假' }}
      </button>

      <!-- 請假表單 -->
      <div v-if="showForm" class="bg-white rounded-2xl p-4 space-y-4 border border-orange-100">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">請假日期</label>
          <input
            type="date"
            v-model="form.date"
            :min="today"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-300"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">原因（選填）</label>
          <input
            type="text"
            v-model="form.reason"
            placeholder="例如：出差、生病..."
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-300"
          />
        </div>
        <button
          @click="submit"
          :disabled="submitting"
          class="w-full bg-orange-400 text-white font-semibold py-4 rounded-2xl active:bg-orange-500 disabled:opacity-50"
        >
          {{ submitting ? '送出中...' : '確認請假' }}
        </button>
      </div>

      <!-- 請假記錄 -->
      <div>
        <p class="text-xs text-gray-400 font-medium mb-3 tracking-wide">請假記錄</p>
        <div v-if="loading" class="text-center py-10 text-gray-300 text-sm">載入中...</div>
        <div v-else-if="!leaves.length" class="text-center py-10 text-gray-300">
          <div class="text-3xl mb-2">🏖️</div>
          <p class="text-sm">尚無請假記錄</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="leave in leaves"
            :key="leave.id"
            class="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-gray-100"
          >
            <div>
              <p class="font-medium text-gray-800 text-sm">{{ leave.leave_date }}</p>
              <p v-if="leave.reason" class="text-xs text-gray-400 mt-0.5">{{ leave.reason }}</p>
            </div>
            <button
              v-if="leave.leave_date >= today"
              @click="cancel(leave)"
              class="text-xs text-orange-400 border border-orange-200 rounded-lg px-3 py-1.5"
            >
              取消
            </button>
            <span v-else class="text-xs text-gray-300">已過期</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
