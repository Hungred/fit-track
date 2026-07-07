<script setup>
import { ref, computed, onMounted } from 'vue'
import { spaceApi } from '../api/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const bookings = ref([])
const spaces = ref([])
const filterStatus = ref('')
const currentMonth = ref(dayjs().format('YYYY-MM'))
const showForm = ref(false)
const showDetail = ref(false)
const editingBooking = ref(null)
const selectedBooking = ref(null)
const submitting = ref(false)

const STATUS_CONFIG = {
  pending:   { label: '待確認', class: 'bg-yellow-50 text-yellow-700' },
  confirmed: { label: '已確認', class: 'bg-green-50 text-green-700' },
  cancelled: { label: '已取消', class: 'bg-gray-100 text-gray-500' },
}

const emptyForm = () => ({
  space_id: '',
  renter_name: '',
  renter_phone: '',
  date: dayjs().format('YYYY-MM-DD'),
  start_time: '09:00',
  end_time: '10:00',
  notes: '',
})
const form = ref(emptyForm())

const filteredBookings = computed(() =>
  filterStatus.value
    ? bookings.value.filter(b => b.status === filterStatus.value)
    : bookings.value
)

async function load() {
  const [bRes, sRes] = await Promise.all([
    spaceApi.listBookings({ month: currentMonth.value }),
    spaceApi.listSpaces(),
  ])
  bookings.value = bRes.data.bookings
  spaces.value = sRes.data.spaces
}

function prevMonth() {
  currentMonth.value = dayjs(currentMonth.value).subtract(1, 'month').format('YYYY-MM')
  load()
}
function nextMonth() {
  currentMonth.value = dayjs(currentMonth.value).add(1, 'month').format('YYYY-MM')
  load()
}

function openCreate() {
  editingBooking.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(booking) {
  editingBooking.value = booking
  form.value = {
    space_id: booking.space_id,
    renter_name: booking.renter_name,
    renter_phone: booking.renter_phone || '',
    date: dayjs(booking.start_at).format('YYYY-MM-DD'),
    start_time: dayjs(booking.start_at).format('HH:mm'),
    end_time: dayjs(booking.end_at).format('HH:mm'),
    notes: booking.notes || '',
  }
  showDetail.value = false
  showForm.value = true
}

async function submit() {
  if (!form.value.space_id || !form.value.renter_name || !form.value.date) {
    ElMessage.warning('請填寫必填欄位')
    return
  }
  submitting.value = true
  try {
    const start_at = `${form.value.date}T${form.value.start_time}:00+08:00`
    const end_at = `${form.value.date}T${form.value.end_time}:00+08:00`
    const payload = {
      space_id: form.value.space_id,
      renter_name: form.value.renter_name,
      renter_phone: form.value.renter_phone || null,
      start_at,
      end_at,
      notes: form.value.notes || null,
    }
    if (editingBooking.value) {
      await spaceApi.updateBooking(editingBooking.value.id, payload)
      ElMessage.success('預約已更新')
    } else {
      await spaceApi.createBooking(payload)
      ElMessage.success('預約已建立')
    }
    showForm.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    submitting.value = false
  }
}

async function confirm(booking) {
  try {
    await spaceApi.updateBooking(booking.id, { status: 'confirmed' })
    ElMessage.success('已確認，LINE 通知已發送')
    await load()
    if (selectedBooking.value?.id === booking.id) showDetail.value = false
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  }
}

async function cancel(booking) {
  try {
    await spaceApi.updateBooking(booking.id, { status: 'cancelled' })
    ElMessage.success('已取消')
    await load()
    if (selectedBooking.value?.id === booking.id) showDetail.value = false
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  }
}

async function remove(booking) {
  await ElMessageBox.confirm('確定刪除此預約？', '確認刪除', { type: 'warning' })
  try {
    await spaceApi.deleteBooking(booking.id)
    ElMessage.success('已刪除')
    showDetail.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

function openDetail(booking) {
  selectedBooking.value = booking
  showDetail.value = true
}

function formatTime(booking) {
  const s = dayjs(booking.start_at)
  const e = dayjs(booking.end_at)
  return `${s.format('MM/DD (ddd) HH:mm')} – ${e.format('HH:mm')}`
}

onMounted(load)
</script>

<template>
  <Layout>
    <div class="max-w-4xl mx-auto space-y-4">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-gray-800">場地預約</h1>
        <el-button type="primary" @click="openCreate" style="background:#16a34a;border-color:#16a34a">
          ＋ 手動新增
        </el-button>
      </div>

      <!-- 月份切換 + 篩選 -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <el-button circle size="small" @click="prevMonth">‹</el-button>
          <span class="text-sm font-medium w-20 text-center">{{ currentMonth }}</span>
          <el-button circle size="small" @click="nextMonth">›</el-button>
        </div>
        <el-select v-model="filterStatus" placeholder="全部狀態" clearable size="small" style="width:120px">
          <el-option v-for="(cfg, key) in STATUS_CONFIG" :key="key" :label="cfg.label" :value="key" />
        </el-select>
      </div>

      <!-- 列表 -->
      <div v-if="!filteredBookings.length" class="text-center py-16 text-gray-400">
        <div class="text-4xl mb-3">📋</div>
        <p>本月無預約記錄</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="booking in filteredBookings"
          :key="booking.id"
          class="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-purple-200 transition-colors"
          @click="openDetail(booking)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-gray-800">{{ booking.space?.name }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="STATUS_CONFIG[booking.status]?.class"
                >
                  {{ STATUS_CONFIG[booking.status]?.label }}
                </span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ booking.renter_name }}
                <span v-if="booking.renter_phone" class="text-gray-400">· {{ booking.renter_phone }}</span>
              </p>
              <p class="text-xs text-gray-400 mt-1">{{ formatTime(booking) }}</p>
            </div>
            <div class="text-right shrink-0">
              <div class="font-bold text-purple-600">NT${{ booking.total_price }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 詳情 Dialog -->
    <el-dialog v-model="showDetail" title="預約詳情" width="min(420px, 92vw)">
      <div v-if="selectedBooking" class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">場地</span>
          <span class="font-medium">{{ selectedBooking.space?.name }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">租借人</span>
          <span class="font-medium">{{ selectedBooking.renter_name }}</span>
        </div>
        <div v-if="selectedBooking.renter_phone" class="flex justify-between">
          <span class="text-gray-500">電話</span>
          <span>{{ selectedBooking.renter_phone }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">時間</span>
          <span>{{ formatTime(selectedBooking) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">金額</span>
          <span class="font-bold text-purple-600">NT${{ selectedBooking.total_price }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">狀態</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="STATUS_CONFIG[selectedBooking.status]?.class"
          >
            {{ STATUS_CONFIG[selectedBooking.status]?.label }}
          </span>
        </div>
        <div v-if="selectedBooking.notes">
          <span class="text-gray-500">備註：</span>{{ selectedBooking.notes }}
        </div>
      </div>
      <template #footer>
        <div class="flex flex-wrap gap-2 justify-end">
          <el-button @click="openEdit(selectedBooking)">編輯</el-button>
          <el-button
            v-if="selectedBooking?.status === 'pending'"
            type="primary"
            style="background:#16a34a;border-color:#16a34a"
            @click="confirm(selectedBooking)"
          >
            確認預約
          </el-button>
          <el-button
            v-if="selectedBooking?.status !== 'cancelled'"
            @click="cancel(selectedBooking)"
          >
            取消預約
          </el-button>
          <el-button type="danger" plain @click="remove(selectedBooking)">刪除</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新增/編輯 Dialog -->
    <el-dialog
      v-model="showForm"
      :title="editingBooking ? '編輯預約' : '手動新增預約'"
      width="min(480px, 92vw)"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">場地 *</label>
          <el-select v-model="form.space_id" placeholder="選擇場地" class="w-full">
            <el-option v-for="s in spaces" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">租借人 *</label>
            <el-input v-model="form.renter_name" placeholder="姓名" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">電話</label>
            <el-input v-model="form.renter_phone" placeholder="選填" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">日期 *</label>
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">開始時間</label>
            <el-time-select v-model="form.start_time" start="06:00" end="22:00" step="00:30" class="w-full" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">結束時間</label>
            <el-time-select v-model="form.end_time" start="06:30" end="23:00" step="00:30" class="w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">備註</label>
          <el-input v-model="form.notes" type="textarea" :rows="2" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit"
          style="background:#16a34a;border-color:#16a34a">
          {{ editingBooking ? '儲存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
