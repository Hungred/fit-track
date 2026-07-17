<script setup>
import { ref, computed, onMounted } from 'vue'
import { spaceApi } from '../api/index.js'
import { useUserStore } from '../stores/user.js'

const store = useUserStore()
const spaces = ref([])
const step = ref(1) // 1=選場地 2=選時間 3=填資料 4=成功
const error = ref('')
const submitting = ref(false)

const selectedSpace = ref(null)
const form = ref({
  date: '',
  start_time: '',
  end_time: '',
  renter_name: '',
  renter_phone: '',
  notes: '',
})

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

const today = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('sv-SE') // YYYY-MM-DD
})

const totalHours = computed(() => {
  if (!form.value.start_time || !form.value.end_time) return 0
  const [sh, sm] = form.value.start_time.split(':').map(Number)
  const [eh, em] = form.value.end_time.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) diff += 24 * 60  // 跨午夜
  return diff / 60
})

const totalPrice = computed(() => {
  if (!selectedSpace.value || totalHours.value <= 0) return 0
  return Math.round(totalHours.value * selectedSpace.value.price_per_hour)
})

function isDayDisabled(day) {
  if (!selectedSpace.value?.available_days) return false
  return !selectedSpace.value.available_days.includes(day)
}

function isDateDisabled(dateStr) {
  if (!dateStr || !selectedSpace.value) return false
  const d = new Date(dateStr)
  return isDayDisabled(d.getDay())
}

function selectSpace(space) {
  selectedSpace.value = space
  form.value.date = ''
  form.value.start_time = space.open_time?.slice(0, 5) || '08:00'
  const [oh, om] = (space.open_time?.slice(0, 5) || '08:00').split(':').map(Number)
  const endH = oh + 1
  form.value.end_time = `${String(endH).padStart(2, '0')}:${String(om).padStart(2, '0')}`
  step.value = 2
}

function goStep3() {
  error.value = ''
  if (!form.value.date) { error.value = '請選擇日期'; return }
  if (isDateDisabled(form.value.date)) { error.value = '此日期不開放預約'; return }
  if (!form.value.start_time || !form.value.end_time) { error.value = '請選擇時間'; return }
  if (totalHours.value <= 0) { error.value = '結束時間需晚於開始時間'; return }
  step.value = 3
  if (store.member) form.value.renter_name = store.member.name
}

async function submit() {
  error.value = ''
  if (!form.value.renter_name) { error.value = '請填寫姓名'; return }
  submitting.value = true
  try {
    const [sh] = form.value.start_time.split(':').map(Number)
    const [eh] = form.value.end_time.split(':').map(Number)
    const endDate = eh <= sh
      ? new Date(new Date(form.value.date).getTime() + 86400000).toLocaleDateString('sv-SE')
      : form.value.date
    const start_at = `${form.value.date}T${form.value.start_time}:00+08:00`
    const end_at = `${endDate}T${form.value.end_time}:00+08:00`
    await spaceApi.createBooking({
      space_id: selectedSpace.value.id,
      renter_name: form.value.renter_name,
      renter_phone: form.value.renter_phone || null,
      renter_line_uid: store.lineProfile?.userId || null,
      start_at,
      end_at,
      notes: form.value.notes || null,
    })
    step.value = 4
  } catch (err) {
    error.value = err.response?.data?.error || '預約失敗，請再試一次'
  } finally {
    submitting.value = false
  }
}

function reset() {
  selectedSpace.value = null
  form.value = { date: '', start_time: '', end_time: '', renter_name: '', renter_phone: '', notes: '' }
  step.value = 1
  error.value = ''
}

onMounted(async () => {
  try {
    const res = await spaceApi.listSpaces()
    spaces.value = (res.data.spaces || []).filter(s => s.is_active)
  } catch {
    error.value = '無法載入場地資訊'
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
      <button v-if="step > 1 && step < 4" @click="step--" class="text-gray-500 text-lg">‹</button>
      <h1 class="font-bold text-gray-800">🏢 場地租借</h1>
    </header>

    <div class="p-4 max-w-lg mx-auto">
      <!-- Step 1: 選場地 -->
      <div v-if="step === 1" class="space-y-3">
        <p class="text-sm text-gray-500">請選擇要租借的場地</p>
        <div v-if="!spaces.length && !error" class="text-center py-12 text-gray-400">
          <div class="text-3xl mb-2">🏢</div>
          <p>載入中...</p>
        </div>
        <div v-if="error" class="text-center py-8 text-red-500 text-sm">{{ error }}</div>
        <div
          v-for="space in spaces"
          :key="space.id"
          class="bg-white rounded-2xl border border-gray-100 p-4 active:bg-gray-50 cursor-pointer"
          @click="selectSpace(space)"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold text-gray-800">{{ space.name }}</div>
              <div v-if="space.description" class="text-sm text-gray-500 mt-1">{{ space.description }}</div>
              <div class="text-xs text-gray-400 mt-2 space-y-0.5">
                <div>📅 {{ (space.available_days || []).length === 7 ? '每天' : (space.available_days || []).sort().map(d => `週${DAYS[d]}`).join('、') }}</div>
                <div>🕐 {{ space.open_time?.slice(0,5) }} – {{ space.close_time?.slice(0,5) }}</div>
              </div>
            </div>
            <div class="text-right shrink-0 ml-4">
              <div class="text-xl font-bold text-purple-600">NT${{ space.price_per_hour }}</div>
              <div class="text-xs text-gray-400">/小時</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: 選日期時間 -->
      <div v-if="step === 2" class="space-y-4">
        <div class="bg-purple-50 rounded-xl px-4 py-3 text-sm text-purple-700">
          📍 {{ selectedSpace?.name }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">選擇日期</label>
          <input
            type="date"
            v-model="form.date"
            :min="today"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400"
          />
          <p v-if="selectedSpace" class="text-xs text-gray-400 mt-1">
            開放日期：{{ (selectedSpace.available_days || []).length === 7 ? '每天' : (selectedSpace.available_days || []).sort().map(d => `週${DAYS[d]}`).join('、') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="min-w-0">
            <label class="block text-sm font-medium text-gray-700 mb-2">開始時間</label>
            <input
              type="time"
              v-model="form.start_time"
              :min="selectedSpace?.open_time?.slice(0,5)"
              class="w-full border border-gray-200 rounded-xl px-2 py-3 text-base focus:outline-none focus:border-purple-400"
            />
          </div>
          <div class="min-w-0">
            <label class="block text-sm font-medium text-gray-700 mb-2">結束時間</label>
            <input
              type="time"
              v-model="form.end_time"
              class="w-full border border-gray-200 rounded-xl px-2 py-3 text-base focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <div v-if="totalHours > 0" class="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
          <div class="flex justify-between text-gray-600">
            <span>租借時數</span>
            <span>{{ totalHours }} 小時</span>
          </div>
          <div class="flex justify-between font-bold text-purple-700">
            <span>費用</span>
            <span>NT${{ totalPrice }}</span>
          </div>
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          @click="goStep3"
          class="w-full bg-purple-600 text-white font-semibold py-4 rounded-2xl active:bg-purple-700"
        >
          下一步 →
        </button>
      </div>

      <!-- Step 3: 填資料 -->
      <div v-if="step === 3" class="space-y-4">
        <div class="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1 text-gray-600">
          <div>📍 {{ selectedSpace?.name }}</div>
          <div>📅 {{ form.date }} {{ form.start_time }} – {{ form.end_time }}</div>
          <div class="font-bold text-purple-700">NT${{ totalPrice }}</div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
          <input
            type="text"
            v-model="form.renter_name"
            placeholder="請輸入姓名"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">電話</label>
          <input
            type="tel"
            v-model="form.renter_phone"
            placeholder="選填"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">備註</label>
          <textarea
            v-model="form.notes"
            placeholder="其他需求（選填）"
            rows="3"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 resize-none"
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          @click="submit"
          :disabled="submitting"
          class="w-full bg-purple-600 text-white font-semibold py-4 rounded-2xl active:bg-purple-700 disabled:opacity-50"
        >
          {{ submitting ? '送出中...' : '送出預約' }}
        </button>
      </div>

      <!-- Step 4: 成功 -->
      <div v-if="step === 4" class="text-center py-16 space-y-4">
        <div class="text-6xl">✅</div>
        <h2 class="text-xl font-bold text-gray-800">預約已送出！</h2>
        <p class="text-sm text-gray-500">
          我們已收到你的場地預約申請<br>
          確認後將透過 LINE 通知你
        </p>
        <div class="bg-gray-50 rounded-xl px-4 py-4 text-sm text-left space-y-2 mx-4">
          <div class="flex justify-between">
            <span class="text-gray-500">場地</span>
            <span class="font-medium">{{ selectedSpace?.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">日期時間</span>
            <span>{{ form.date }} {{ form.start_time }}–{{ form.end_time }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">費用</span>
            <span class="font-bold text-purple-600">NT${{ totalPrice }}</span>
          </div>
        </div>
        <button
          @click="reset"
          class="w-full bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl"
        >
          再次預約
        </button>
      </div>
    </div>
  </div>
</template>
