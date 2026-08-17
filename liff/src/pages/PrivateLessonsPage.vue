<script setup>
import { ref, onMounted } from 'vue'
import { classRequestApi } from '../api/index.js'
import dayjs from 'dayjs'

const today = dayjs().format('YYYY-MM-DD')

const coaches = ref([])
const selectedCoach = ref(null)
const slots = ref([{ date: today, time: '09:00' }])
const notes = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await classRequestApi.listCoaches()
    coaches.value = res.data.coaches || []
  } finally {
    loading.value = false
  }
})

function addSlot() {
  if (slots.value.length >= 3) return
  slots.value.push({ date: today, time: '09:00' })
}

function removeSlot(i) {
  if (slots.value.length === 1) return
  slots.value.splice(i, 1)
}

async function submit() {
  if (!selectedCoach.value) { error.value = '請選擇教練'; return }
  const filled = slots.value.filter(s => s.date && s.time)
  if (!filled.length) { error.value = '請填寫希望上課時間'; return }
  error.value = ''
  submitting.value = true
  try {
    const preferred_dates = filled.map(s => `${s.date}T${s.time}:00+08:00`)
    await classRequestApi.submit({ coach_id: selectedCoach.value, preferred_dates, notes: notes.value || null })
    submitted.value = true
  } catch (err) {
    error.value = err.response?.data?.error || '送出失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-green-700 text-white px-5 pt-14 pb-5">
      <h1 class="text-xl font-bold">私人課程申請</h1>
      <p class="text-sm text-green-200 mt-1">選擇教練與希望上課的時間，確認後會通知你</p>
    </div>

    <!-- 送出成功 -->
    <div v-if="submitted" class="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div class="text-5xl mb-5">✅</div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">申請已送出！</h2>
      <p class="text-gray-500 text-sm">教練確認時間後，你會收到 LINE 通知。</p>
    </div>

    <div v-else-if="loading" class="text-center py-20 text-gray-400">載入中…</div>

    <!-- 表單 -->
    <div v-else class="px-5 py-6 space-y-5 max-w-lg mx-auto">

      <!-- 選教練 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <p class="font-semibold text-gray-700 mb-3">選擇教練 <span class="text-red-400">*</span></p>
        <div class="space-y-2">
          <button
            v-for="coach in coaches" :key="coach.id"
            @click="selectedCoach = coach.id"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left"
            :class="selectedCoach === coach.id
              ? 'border-green-600 bg-green-50'
              : 'border-gray-100 bg-gray-50'"
          >
            <div class="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {{ coach.name.charAt(0) }}
            </div>
            <span class="font-medium text-gray-800">{{ coach.name }}</span>
            <span v-if="selectedCoach === coach.id" class="ml-auto text-green-600 text-lg">✓</span>
          </button>
          <p v-if="!coaches.length" class="text-sm text-gray-400 text-center py-3">暫無可選教練</p>
        </div>
      </div>

      <!-- 希望時間 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <p class="font-semibold text-gray-700">希望上課時間 <span class="text-red-400">*</span></p>
          <p class="text-xs text-gray-400 mt-0.5">可填最多 3 個備選時間</p>
        </div>

        <div v-for="(slot, i) in slots" :key="i" class="flex items-start gap-2">
          <div class="flex-1 flex flex-col gap-2">
            <input
              v-model="slot.date"
              type="date"
              :min="today"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <input
              v-model="slot.time"
              type="time"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <button
            v-if="slots.length > 1"
            @click="removeSlot(i)"
            class="text-gray-300 hover:text-red-400 text-xl leading-none shrink-0 mt-2.5"
          >✕</button>
        </div>

        <button
          v-if="slots.length < 3"
          @click="addSlot"
          class="text-sm text-green-600 font-medium"
        >＋ 新增備選時間</button>
      </div>

      <!-- 備注 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <p class="font-semibold text-gray-700 mb-3">備注（選填）</p>
        <textarea
          v-model="notes"
          placeholder="例如：想練上肢、有膝蓋舊傷等…"
          rows="3"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-green-500"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

      <button
        @click="submit"
        :disabled="submitting"
        class="w-full py-3.5 rounded-2xl text-white font-semibold text-base transition"
        :class="submitting ? 'bg-gray-300' : 'bg-green-700 active:bg-green-800'"
      >
        {{ submitting ? '送出中…' : '送出申請' }}
      </button>
    </div>
  </div>
</template>
