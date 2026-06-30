<script setup>
import { ref, computed, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { classApi, coachApi } from '../api/index.js'
import { useAuthStore } from '../stores/auth.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const auth = useAuthStore()
const calendarRef = ref(null)
const members = ref([])
const showForm = ref(false)
const showDetail = ref(false)
const editingClass = ref(null)
const selectedClass = ref(null)
const submitting = ref(false)

// 編輯用（單筆）
const emptyForm = () => ({
  title: '',
  date: dayjs().format('YYYY-MM-DD'),
  start_time: '09:00',
  end_time: '10:00',
  max_students: '',
  notes: '',
  member_ids: [],
})
const form = ref(emptyForm())

// 批次新增
const emptyItem = (date = dayjs().format('YYYY-MM-DD')) => ({
  date, start_time: '09:00', end_time: '10:00', title: '', notes: '', member_ids: [],
})
const batchItems = ref([emptyItem()])
const batchStep = ref(1) // 1=填寫 2=預覽

function addBatchItem() {
  const last = batchItems.value[batchItems.value.length - 1]
  batchItems.value.push(emptyItem(last?.date))
}

function removeBatchItem(i) {
  if (batchItems.value.length === 1) return
  batchItems.value.splice(i, 1)
}

function onStartTimeChange(item) {
  if (!item.start_time) return
  const [h, m] = item.start_time.split(':').map(Number)
  const endH = (h + 1) % 24
  item.end_time = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const previewGroups = computed(() => {
  const valid = batchItems.value.filter(i => i.date && i.start_time)
  const sorted = [...valid].sort((a, b) => `${a.date}${a.start_time}` < `${b.date}${b.start_time}` ? -1 : 1)
  const groups = {}
  sorted.forEach(item => {
    if (!groups[item.date]) groups[item.date] = []
    groups[item.date].push(item)
  })
  return groups
})

function memberNames(ids) {
  return ids.map(id => members.value.find(m => m.id === id)?.name).filter(Boolean).join('、') || '（未邀請）'
}

async function submitBatch() {
  const classes = batchItems.value
    .filter(i => i.date && i.start_time)
    .map(i => ({
      title: i.title || null,
      start_at: `${i.date}T${i.start_time}:00+08:00`,
      end_at: i.end_time ? `${i.date}T${i.end_time}:00+08:00` : null,
      notes: i.notes || null,
      member_ids: i.member_ids,
    }))

  if (!classes.length) { ElMessage.warning('請至少填寫一筆課程'); return }

  submitting.value = true
  try {
    const res = await classApi.batchCreate(classes)
    ElMessage.success(`已建立 ${res.data.created} 堂課程並推播通知`)
    showForm.value = false
    batchStep.value = 1
    batchItems.value = [emptyItem()]
    await refreshAll()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    submitting.value = false
  }
}

function getHeaderToolbar() {
  return window.innerWidth < 640
    ? { left: 'prev,next', center: 'title', right: 'today' }
    : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,myWeek' }
}

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: 'zh-tw',
  headerToolbar: getHeaderToolbar(),
  windowResize: () => {
    calendarRef.value?.getApi()?.setOption('headerToolbar', getHeaderToolbar())
  },
  customButtons: {
    myWeek: {
      text: '週',
      click: () => {
        const api = calendarRef.value?.getApi()
        if (!api) return
        api.changeView('timeGridWeek')
        api.today()
      },
    },
  },
  buttonText: { today: '今天', month: '月' },
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  eventSources: [{ events: loadEvents }],
  dateClick: (info) => {
    if (!auth.hasPermission('classes:create')) return
    editingClass.value = null
    batchItems.value = [emptyItem(info.dateStr)]
    batchStep.value = 1
    showForm.value = true
  },
  eventClick: (info) => {
    openDetail(info.event.extendedProps.classData)
  },
})

function classEventColor(cls) {
  const enrollments = cls.enrollments || []
  if (!enrollments.length) return { bg: '#9ca3af', border: '#6b7280' }
  if (enrollments.some(e => e.status === 'pending')) return { bg: '#f59e0b', border: '#d97706' }
  return { bg: '#16a34a', border: '#15803d' }
}

function buildEvent(c) {
  const names = (c.enrollments || []).map(e => e.member?.name).filter(Boolean).join('、')
  const { bg, border } = classEventColor(c)
  return {
    id: c.id,
    title: names || c.title || '上課',
    start: c.start_at,
    end: c.end_at || undefined,
    backgroundColor: bg,
    borderColor: border,
    extendedProps: { classData: c },
  }
}

async function loadEvents(info) {
  const months = []
  let curr = dayjs(info.start).startOf('month')
  const last = dayjs(info.end).subtract(1, 'day').startOf('month')
  while (!curr.isAfter(last)) {
    months.push(curr.format('YYYY-MM'))
    curr = curr.add(1, 'month')
  }
  const results = await Promise.all(months.map(m => classApi.list(m)))
  const seen = new Set()
  return results
    .flatMap(r => r.data.classes || [])
    .filter(c => !seen.has(c.id) && seen.add(c.id))
    .map(buildEvent)
}

function refreshAll() {
  calendarRef.value?.getApi()?.refetchEvents()
}

async function fetchMembers() {
  const res = await coachApi.getDashboard()
  members.value = res.data.members || []
}

async function openDetail(cls) {
  const res = await classApi.get(cls.id)
  selectedClass.value = res.data.class
  showDetail.value = true
}

function openEdit() {
  const cls = selectedClass.value
  form.value = {
    title: cls.title,
    date: dayjs(cls.start_at).format('YYYY-MM-DD'),
    start_time: dayjs(cls.start_at).format('HH:mm'),
    end_time: cls.end_at ? dayjs(cls.end_at).format('HH:mm') : '',
    max_students: cls.max_students || '',
    notes: cls.notes || '',
    member_ids: (cls.enrollments || []).map(e => e.member?.id).filter(Boolean),
  }
  editingClass.value = cls
  showDetail.value = false
  showForm.value = true
}

async function submitForm() {
  if (!form.value.date || !form.value.start_time) {
    ElMessage.warning('請填寫開始時間')
    return
  }
  submitting.value = true
  try {
    const start_at = `${form.value.date}T${form.value.start_time}:00+08:00`
    const end_at = form.value.end_time ? `${form.value.date}T${form.value.end_time}:00+08:00` : null

    const payload = {
      title: form.value.title,
      start_at,
      end_at,
      max_students: form.value.max_students || null,
      notes: form.value.notes || null,
    }

    if (editingClass.value) {
      await classApi.update(editingClass.value.id, payload)
      ElMessage.success('課程已更新')
    } else {
      payload.member_ids = form.value.member_ids
      await classApi.create(payload)
      ElMessage.success('課程已建立，通知已發送')
    }
    showForm.value = false
    await refreshAll()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    submitting.value = false
  }
}

async function deleteClass(cls) {
  await ElMessageBox.confirm(`確定要刪除「${cls.title}」嗎？`, '確認刪除', { type: 'warning' })
  try {
    await classApi.delete(cls.id)
    ElMessage.success('已刪除')
    showDetail.value = false
    await refreshAll()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

const statusLabel = { pending: '待確認', confirmed: '確認出席', leave: '請假', discuss: '討論中', attended: '已出席' }
const statusColor = { pending: 'text-gray-400', confirmed: 'text-green-600', leave: 'text-orange-400', discuss: 'text-blue-500', attended: 'text-purple-600' }

async function changeEnrollmentStatus(enrollment, newStatus) {
  const oldStatus = enrollment.status
  enrollment.status = newStatus
  try {
    await classApi.updateEnrollmentStatus(selectedClass.value.id, enrollment.member.id, newStatus)
    ElMessage.success('狀態已更新')
  } catch (err) {
    enrollment.status = oldStatus
    ElMessage.error(err.response?.data?.error || '操作失敗')
  }
}

onMounted(async () => {
  await fetchMembers()
})
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">排課管理</h2>
      <el-button
        v-if="auth.hasPermission('classes:create')"
        type="primary"
        @click="() => { editingClass = null; batchItems = [emptyItem()]; batchStep = 1; showForm = true }"
        style="background:#16a34a;border-color:#16a34a"
      >
        ＋ 新增課程
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <!-- 課程詳情 Dialog -->
    <el-dialog v-model="showDetail" :title="selectedClass?.title" width="min(480px, 92vw)">
      <div v-if="selectedClass" class="space-y-4">
        <div class="text-sm text-gray-500 space-y-1">
          <p>🕐 {{ dayjs(selectedClass.start_at).format('YYYY/MM/DD HH:mm') }}
            <span v-if="selectedClass.end_at">— {{ dayjs(selectedClass.end_at).format('HH:mm') }}</span>
          </p>
          <p v-if="selectedClass.coach">👤 教練：{{ selectedClass.coach.name }}</p>
          <p v-if="selectedClass.max_students">👥 人數上限：{{ selectedClass.max_students }}</p>
          <p v-if="selectedClass.notes">📝 {{ selectedClass.notes }}</p>
        </div>

        <div>
          <p class="text-sm font-semibold text-gray-700 mb-2">出席狀況</p>
          <div v-if="selectedClass.enrollments?.length" class="space-y-1.5">
            <div
              v-for="e in selectedClass.enrollments"
              :key="e.id"
              class="flex items-center justify-between text-sm py-1.5 px-3 bg-gray-50 rounded-lg"
            >
              <span class="text-gray-700">{{ e.member?.name }}</span>
              <el-select
                :model-value="e.status"
                size="small"
                style="width: 110px"
                @change="(val) => changeEnrollmentStatus(e, val)"
              >
                <el-option v-for="(label, val) in statusLabel" :key="val" :value="val" :label="label" />
              </el-select>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">尚未邀請任何學員</p>
        </div>

        <a
          :href="`${$root.$el?.baseURI?.split('/api')[0] ?? ''}/api/classes/${selectedClass.id}/ical`"
          class="text-sm text-green-600 hover:underline"
          target="_blank"
        >
          📅 下載 iCal (.ics)
        </a>
      </div>
      <template #footer>
        <el-button
          v-if="auth.hasPermission('classes:delete')"
          type="danger"
          @click="deleteClass(selectedClass)"
        >刪除</el-button>
        <el-button
          v-if="auth.hasPermission('classes:edit')"
          type="primary"
          @click="openEdit"
          style="background:#16a34a;border-color:#16a34a"
        >編輯</el-button>
      </template>
    </el-dialog>

    <!-- 新增（批次）/ 編輯 Dialog -->
    <el-dialog
      v-model="showForm"
      :title="editingClass ? '編輯課程' : (batchStep === 1 ? '新增課程' : '確認課程內容')"
      :width="editingClass ? 'min(480px, 92vw)' : 'min(680px, 95vw)'"
    >
      <!-- 編輯模式（單筆） -->
      <div v-if="editingClass" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">課程名稱（選填）</label>
          <el-input v-model="form.title" placeholder="例如：週一早班" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">日期 *</label>
            <el-input v-model="form.date" type="date" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">開始時間 *</label>
            <el-input v-model="form.start_time" type="time" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">結束時間</label>
            <el-input v-model="form.end_time" type="time" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">備註（選填）</label>
          <el-input v-model="form.notes" type="textarea" :rows="2" />
        </div>
      </div>

      <!-- 新增模式（批次） -->
      <div v-else>
        <!-- Step 1: 填寫 -->
        <div v-if="batchStep === 1" class="space-y-3">
          <div
            v-for="(item, i) in batchItems"
            :key="i"
            class="border border-gray-100 rounded-xl p-4 space-y-3 relative"
          >
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-xs text-gray-500 mb-1">日期 *</label>
                <el-input v-model="item.date" type="date" size="small" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">開始 *</label>
                <el-input v-model="item.start_time" type="time" size="small" @change="onStartTimeChange(item)" />
              </div>
              <div class="flex items-end gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-gray-500 mb-1">結束</label>
                  <el-input v-model="item.end_time" type="time" size="small" />
                </div>
                <button
                  v-if="batchItems.length > 1"
                  @click="removeBatchItem(i)"
                  class="mb-0.5 text-gray-400 hover:text-red-400 text-lg leading-none flex-shrink-0"
                >×</button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">課程名稱（選填）</label>
                <el-input v-model="item.title" placeholder="例如：早班" size="small" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">備註（選填）</label>
                <el-input v-model="item.notes" placeholder="" size="small" />
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">邀請學員</label>
              <el-select v-model="item.member_ids" multiple size="small" class="w-full" placeholder="選擇學員（送出後推 LINE）">
                <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
              </el-select>
            </div>
          </div>

          <button
            @click="addBatchItem"
            class="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors"
          >
            ＋ 新增時段
          </button>
        </div>

        <!-- Step 2: 預覽 -->
        <div v-else class="space-y-4">
          <p class="text-sm text-gray-500">確認以下課程內容，送出後將推播 LINE 通知給邀請的學員。</p>
          <div v-for="(items, date) in previewGroups" :key="date" class="space-y-2">
            <p class="text-sm font-semibold text-gray-700">
              {{ dayjs(date).format('MM/DD (dd)') }}
            </p>
            <div
              v-for="(item, i) in items"
              :key="i"
              class="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1"
            >
              <div class="flex items-center gap-2 text-gray-700">
                <span class="font-medium">{{ item.start_time }}{{ item.end_time ? `–${item.end_time}` : '' }}</span>
                <span v-if="item.title" class="text-gray-500">{{ item.title }}</span>
              </div>
              <div class="text-xs text-green-600">👥 {{ memberNames(item.member_ids) }}</div>
              <div v-if="item.notes" class="text-xs text-gray-400">{{ item.notes }}</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <!-- 編輯模式 -->
        <el-button v-if="editingClass" type="primary" :loading="submitting" @click="submitForm"
          style="background:#16a34a;border-color:#16a34a">更新</el-button>
        <!-- 新增 step 1 -->
        <el-button v-else-if="batchStep === 1" type="primary" @click="batchStep = 2"
          style="background:#16a34a;border-color:#16a34a">預覽確認 →</el-button>
        <!-- 新增 step 2 -->
        <template v-else>
          <el-button @click="batchStep = 1">← 返回修改</el-button>
          <el-button type="primary" :loading="submitting" @click="submitBatch"
            style="background:#16a34a;border-color:#16a34a">確認送出</el-button>
        </template>
      </template>
    </el-dialog>
  </Layout>
</template>
