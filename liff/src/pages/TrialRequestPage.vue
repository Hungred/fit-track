<script setup>
import { ref } from 'vue'
import { trialRequestApi } from '../api/index.js'
import { useUserStore } from '../stores/user.js'

const store = useUserStore()

const CONTACT_TIME_OPTIONS = [
  { value: 'morning', label: '上午（09:00 - 12:00）' },
  { value: 'afternoon', label: '下午（12:00 - 18:00）' },
  { value: 'evening', label: '晚上（18:00 - 21:00）' },
  { value: 'anytime', label: '隨時皆可（文字訊息聯絡即可）' },
]
const GENDER_OPTIONS = [
  { value: 'female', label: '女教練' },
  { value: 'male', label: '男教練' },
  { value: 'either', label: '皆可 / 依時間安排為主' },
]
const TRIAL_TIME_OPTIONS = [
  { value: 'weekday_day', label: '平日白天' },
  { value: 'weekday_night', label: '平日晚上' },
  { value: 'weekend_day', label: '假日白天' },
  { value: 'weekend_night', label: '假日晚上' },
  { value: 'other', label: '其他特殊指定時間（請於備註說明）' },
]

const form = ref({
  name: '',
  phone: '',
  contact_info: '',
  contact_time_slots: [],
  coach_gender_preference: '',
  trial_time_slots: [],
  notes: '',
})

const error = ref('')
const submitting = ref(false)
const submitted = ref(false)

function toggleSlot(list, value) {
  const i = list.indexOf(value)
  if (i === -1) list.push(value)
  else list.splice(i, 1)
}

async function submit() {
  error.value = ''
  if (!form.value.name.trim()) { error.value = '請填寫您的姓名'; return }
  if (!form.value.phone.trim()) { error.value = '請填寫聯絡電話'; return }
  if (!form.value.contact_info.trim()) { error.value = '請填寫 LINE ID / 其他聯絡方式'; return }
  if (!form.value.contact_time_slots.length) { error.value = '請選擇方便聯繫的時間區段'; return }
  if (!form.value.coach_gender_preference) { error.value = '請選擇偏好的教練性別'; return }
  if (!form.value.trial_time_slots.length) { error.value = '請選擇期望預約體驗的時間區段'; return }

  submitting.value = true
  try {
    await trialRequestApi.submit({
      ...form.value,
      notes: form.value.notes || null,
      line_uid: store.lineProfile?.userId || null,
    })
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
    <div class="bg-orange-700 text-white px-5 pt-14 pb-5">
      <h1 class="text-xl font-bold">體驗課申請</h1>
      <p class="text-sm text-orange-200 mt-1">填寫以下資訊，我們會盡快與你聯繫安排體驗課</p>
    </div>

    <!-- 送出成功 -->
    <div v-if="submitted" class="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div class="text-5xl mb-5">✅</div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">申請已送出！</h2>
      <p class="text-gray-500 text-sm">我們會盡快依你方便的時間與你聯繫。</p>
    </div>

    <!-- 表單 -->
    <div v-else class="px-5 py-6 space-y-5 max-w-lg mx-auto">

      <!-- 基本資料 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <p class="font-semibold text-gray-700 mb-2">您的姓名 <span class="text-red-400">*</span></p>
          <input
            v-model="form.name"
            type="text"
            placeholder="請輸入姓名"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <p class="font-semibold text-gray-700 mb-2">聯絡電話 <span class="text-red-400">*</span></p>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="請輸入電話"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <p class="font-semibold text-gray-700 mb-2">LINE ID / 其他聯絡方式 <span class="text-red-400">*</span></p>
          <input
            v-model="form.contact_info"
            type="text"
            placeholder="請輸入 LINE ID 或其他聯絡方式"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <!-- 方便聯繫時間 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <p class="font-semibold text-gray-700 mb-3">方便電話／訊息聯繫的時間區段 <span class="text-red-400">*</span></p>
        <div class="space-y-2">
          <label
            v-for="opt in CONTACT_TIME_OPTIONS" :key="opt.value"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition"
            :class="form.contact_time_slots.includes(opt.value) ? 'border-orange-600 bg-orange-50' : 'border-gray-100 bg-gray-50'"
          >
            <input
              type="checkbox"
              :checked="form.contact_time_slots.includes(opt.value)"
              @change="toggleSlot(form.contact_time_slots, opt.value)"
              class="accent-orange-600 w-4 h-4"
            />
            <span class="text-sm text-gray-800">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- 偏好教練性別 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <p class="font-semibold text-gray-700 mb-3">偏好的教練性別 <span class="text-red-400">*</span></p>
        <div class="space-y-2">
          <label
            v-for="opt in GENDER_OPTIONS" :key="opt.value"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition"
            :class="form.coach_gender_preference === opt.value ? 'border-orange-600 bg-orange-50' : 'border-gray-100 bg-gray-50'"
          >
            <input
              type="radio"
              name="gender_preference"
              :value="opt.value"
              v-model="form.coach_gender_preference"
              class="accent-orange-600 w-4 h-4"
            />
            <span class="text-sm text-gray-800">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- 期望體驗時間 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <p class="font-semibold text-gray-700 mb-3">期望預約體驗的時間區段 <span class="text-red-400">*</span></p>
        <div class="space-y-2">
          <label
            v-for="opt in TRIAL_TIME_OPTIONS" :key="opt.value"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition"
            :class="form.trial_time_slots.includes(opt.value) ? 'border-orange-600 bg-orange-50' : 'border-gray-100 bg-gray-50'"
          >
            <input
              type="checkbox"
              :checked="form.trial_time_slots.includes(opt.value)"
              @change="toggleSlot(form.trial_time_slots, opt.value)"
              class="accent-orange-600 w-4 h-4"
            />
            <span class="text-sm text-gray-800">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- 備註 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <p class="font-semibold text-gray-700 mb-3">備註（選填）</p>
        <textarea
          v-model="form.notes"
          placeholder="例如：特殊指定時間說明、其他需求…"
          rows="3"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-orange-500"
        />
      </div>

      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

      <button
        @click="submit"
        :disabled="submitting"
        class="w-full py-3.5 rounded-2xl text-white font-semibold text-base transition"
        :class="submitting ? 'bg-gray-300' : 'bg-orange-700 active:bg-orange-800'"
      >
        {{ submitting ? '送出中…' : '送出申請' }}
      </button>
    </div>
  </div>
</template>
