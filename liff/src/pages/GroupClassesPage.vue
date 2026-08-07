<script setup>
import { ref, onMounted, computed } from 'vue'
import { groupClassApi } from '../api/index.js'
import { useUserStore } from '../stores/user.js'

const store = useUserStore()
const DAYS = ['日', '一', '二', '三', '四', '五', '六']

const groupClasses = ref([])
const loading = ref(true)
const selectedClass = ref(null)
const selectedTerm = ref(null)
const step = ref('list') // list | detail | enroll | success

const form = ref({ name: '', phone: '' })
const submitting = ref(false)
const errorMsg = ref('')

async function load() {
  loading.value = true
  try {
    const res = await groupClassApi.listPublic()
    groupClasses.value = res.data.group_classes
  } finally {
    loading.value = false
  }
}

function openClass(gc) {
  selectedClass.value = gc
  step.value = 'detail'
}

function selectTerm(term) {
  selectedTerm.value = term
  form.value = {
    name: store.member?.name || '',
    phone: store.member?.phone || '',
  }
  errorMsg.value = ''
  step.value = 'enroll'
}

function openTerms(gc) {
  selectedClass.value = gc
  step.value = 'detail'
}

const openTerms2 = computed(() =>
  (selectedClass.value?.terms || []).filter(t => t.status !== 'closed')
)

const enrolledCount = (term) => term.enrollments?.[0]?.count ?? 0
const isFull = (term) =>
  selectedClass.value?.max_students && enrolledCount(term) >= selectedClass.value.max_students

async function submit() {
  if (!form.value.name) { errorMsg.value = '請填寫姓名'; return }
  if (!form.value.phone) { errorMsg.value = '請填寫電話'; return }
  submitting.value = true
  errorMsg.value = ''
  try {
    let lineUid = null
    try { lineUid = (await window.liff?.getProfile())?.userId } catch {}
    await groupClassApi.enroll(selectedTerm.value.id, {
      member_id: store.member?.id || null,
      renter_name: form.value.name,
      renter_phone: form.value.phone,
      renter_line_uid: lineUid,
    })
    step.value = 'success'
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '報名失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}

function reset() {
  step.value = 'list'
  selectedClass.value = null
  selectedTerm.value = null
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-purple-600 px-4 pt-12 pb-6 text-white">
      <div class="flex items-center gap-3">
        <button v-if="step !== 'list'" @click="step === 'enroll' ? (step = 'detail') : reset()"
          class="text-white/80 hover:text-white">
          ←
        </button>
        <div>
          <h1 class="text-lg font-bold">團課報名</h1>
          <p class="text-purple-200 text-xs mt-0.5">
            {{ step === 'list' ? '選擇團課' : step === 'detail' ? selectedClass?.name : step === 'enroll' ? '填寫資料' : '報名成功' }}
          </p>
        </div>
      </div>
    </div>

    <div class="px-4 py-5 max-w-lg mx-auto">

      <!-- 載入中 -->
      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- 團課列表 -->
      <div v-else-if="step === 'list'" class="space-y-4">
        <div v-if="!groupClasses.length" class="text-center py-16 text-gray-400">
          <div class="text-4xl mb-3">🏋️</div>
          <p>目前沒有開放報名的團課</p>
        </div>
        <div
          v-for="gc in groupClasses" :key="gc.id"
          class="bg-white rounded-2xl shadow-sm overflow-hidden"
          @click="openClass(gc)"
        >
          <div class="bg-purple-600 px-4 py-3">
            <h2 class="font-bold text-white">{{ gc.name }}</h2>
            <p v-if="gc.coach?.name" class="text-purple-200 text-xs mt-0.5">教練 {{ gc.coach.name }}</p>
          </div>
          <div class="px-4 py-3 space-y-1.5">
            <div class="flex items-center gap-4 text-sm text-gray-600">
              <span v-if="gc.day_of_week !== null">📅 每週{{ DAYS[gc.day_of_week] }} {{ gc.start_time?.slice(0,5) }}</span>
              <span>🎯 {{ gc.sessions_per_term }} 堂/期</span>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-600">
              <span>💰 NT${{ gc.price_per_term.toLocaleString() }}/期</span>
              <span v-if="gc.max_students">👥 限 {{ gc.max_students }} 人</span>
            </div>
            <p v-if="gc.description" class="text-xs text-gray-400 mt-1">{{ gc.description }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="term in (gc.terms || []).filter(t => t.status !== 'closed')" :key="term.id"
                class="text-xs px-2 py-1 rounded-full"
                :class="isFull(term) ? 'bg-gray-100 text-gray-400' : 'bg-purple-50 text-purple-700'"
              >
                第{{ term.term_number }}期 {{ term.start_date }}
                {{ isFull(term) ? '（額滿）' : '（招生中）' }}
              </span>
              <span v-if="!(gc.terms || []).filter(t => t.status !== 'closed').length"
                class="text-xs text-gray-400">目前無開放期別</span>
            </div>
          </div>
          <div class="px-4 pb-3">
            <button class="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium">
              查看詳情 →
            </button>
          </div>
        </div>
      </div>

      <!-- 團課詳情 -->
      <div v-else-if="step === 'detail'" class="space-y-4">
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="bg-purple-600 px-4 py-4">
            <h2 class="font-bold text-white text-lg">{{ selectedClass.name }}</h2>
            <p v-if="selectedClass.coach?.name" class="text-purple-200 text-sm mt-1">教練 {{ selectedClass.coach.name }}</p>
          </div>
          <div class="px-4 py-4 space-y-3">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-gray-50 rounded-xl p-3">
                <div class="text-xs text-gray-400 mb-1">上課時間</div>
                <div class="font-medium text-gray-800">
                  {{ selectedClass.day_of_week !== null ? `每週${DAYS[selectedClass.day_of_week]}` : '' }}
                  {{ selectedClass.start_time?.slice(0,5) }}
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-3">
                <div class="text-xs text-gray-400 mb-1">每期堂數</div>
                <div class="font-medium text-gray-800">{{ selectedClass.sessions_per_term }} 堂</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-3">
                <div class="text-xs text-gray-400 mb-1">每期費用</div>
                <div class="font-medium text-purple-700">NT${{ selectedClass.price_per_term.toLocaleString() }}</div>
              </div>
              <div class="bg-gray-50 rounded-xl p-3">
                <div class="text-xs text-gray-400 mb-1">人數上限</div>
                <div class="font-medium text-gray-800">{{ selectedClass.max_students ? `${selectedClass.max_students} 人` : '不限' }}</div>
              </div>
            </div>
            <p v-if="selectedClass.description" class="text-sm text-gray-600 leading-relaxed">
              {{ selectedClass.description }}
            </p>
          </div>
        </div>

        <h3 class="font-semibold text-gray-700">選擇報名期別</h3>
        <div v-if="!openTerms2.length" class="text-center py-8 text-gray-400 text-sm">
          目前沒有開放報名的期別
        </div>
        <div v-for="term in openTerms2" :key="term.id"
          class="bg-white rounded-2xl shadow-sm px-4 py-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="font-semibold text-gray-800">第 {{ term.term_number }} 期</div>
              <div class="text-sm text-gray-500">開始日期：{{ term.start_date }}</div>
              <div v-if="selectedClass.max_students" class="text-xs text-gray-400 mt-0.5">
                已報名 {{ enrolledCount(term) }} / {{ selectedClass.max_students }} 人
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full font-medium"
              :class="term.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'">
              {{ term.status === 'open' ? '招生中' : '上課中' }}
            </span>
          </div>
          <button
            @click="selectTerm(term)"
            :disabled="isFull(term)"
            class="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isFull(term) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white active:bg-purple-700'"
          >
            {{ isFull(term) ? '名額已滿' : '立即報名' }}
          </button>
        </div>
      </div>

      <!-- 填寫報名資料 -->
      <div v-else-if="step === 'enroll'" class="space-y-4">
        <div class="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-1">
          <div class="text-sm font-semibold text-gray-700">{{ selectedClass.name }}｜第 {{ selectedTerm.term_number }} 期</div>
          <div class="text-xs text-gray-400">開始日期：{{ selectedTerm.start_date }}</div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm px-4 py-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
            <input v-model="form.name" type="text" placeholder="請輸入姓名"
              class="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">聯絡電話 *</label>
            <input v-model="form.phone" type="tel" placeholder="請輸入電話"
              class="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-purple-400" />
          </div>
          <p v-if="errorMsg" class="text-red-500 text-sm">{{ errorMsg }}</p>
        </div>

        <div class="bg-purple-50 rounded-2xl px-4 py-3 text-xs text-purple-700 leading-relaxed">
          報名後請等待教練確認，費用於開課當天繳交。如需取消請提前聯繫我們。
        </div>

        <button @click="submit" :disabled="submitting"
          class="w-full py-3.5 rounded-2xl bg-purple-600 text-white font-semibold text-base disabled:opacity-50">
          {{ submitting ? '送出中...' : '確認報名' }}
        </button>
      </div>

      <!-- 報名成功 -->
      <div v-else-if="step === 'success'" class="text-center py-16 space-y-4">
        <div class="text-6xl">🎉</div>
        <h2 class="text-xl font-bold text-gray-800">報名成功！</h2>
        <p class="text-gray-500 text-sm leading-relaxed">
          您已完成「{{ selectedClass.name }}」第 {{ selectedTerm.term_number }} 期的報名<br>
          教練確認後會透過 LINE 通知您
        </p>
        <button @click="reset"
          class="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium">
          返回列表
        </button>
      </div>
    </div>
  </div>
</template>
