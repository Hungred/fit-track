<script setup>
import { ref, onMounted } from 'vue'
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
const events = ref([])
const members = ref([])
const showForm = ref(false)
const showDetail = ref(false)
const editingClass = ref(null)
const selectedClass = ref(null)
const submitting = ref(false)
const currentMonth = ref(dayjs().format('YYYY-MM'))

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

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: 'zh-tw',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek',
  },
  buttonText: { today: '今天', month: '月', week: '週' },
  events: [],
  dateClick: (info) => {
    if (!auth.hasPermission('classes:create')) return
    form.value = emptyForm()
    form.value.date = info.dateStr
    editingClass.value = null
    showForm.value = true
  },
  eventClick: (info) => {
    openDetail(info.event.extendedProps.classData)
  },
  datesSet: (info) => {
    const month = dayjs(info.start).add(15, 'day').format('YYYY-MM')
    if (month !== currentMonth.value) {
      currentMonth.value = month
      fetchClasses(month)
    }
  },
})

async function fetchClasses(month) {
  const res = await classApi.list(month || currentMonth.value)
  const cls = res.data.classes || []
  events.value = cls.map(c => ({
    id: c.id,
    title: c.title,
    start: c.start_at,
    end: c.end_at || undefined,
    backgroundColor: '#16a34a',
    borderColor: '#15803d',
    extendedProps: { classData: c },
  }))
  calendarOptions.value = { ...calendarOptions.value, events: events.value }
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
  if (!form.value.title || !form.value.date || !form.value.start_time) {
    ElMessage.warning('請填寫課程名稱與開始時間')
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
    await fetchClasses()
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
    await fetchClasses()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

const statusLabel = { pending: '待確認', confirmed: '確認出席', leave: '請假', discuss: '討論中' }
const statusColor = { pending: 'text-gray-400', confirmed: 'text-green-600', leave: 'text-orange-400', discuss: 'text-blue-500' }

onMounted(async () => {
  await Promise.all([fetchClasses(), fetchMembers()])
})
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">排課管理</h2>
      <el-button
        v-if="auth.hasPermission('classes:create')"
        type="primary"
        @click="() => { form = emptyForm(); editingClass = null; showForm = true }"
        style="background:#16a34a;border-color:#16a34a"
      >
        ＋ 新增課程
      </el-button>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-4">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <!-- 課程詳情 Dialog -->
    <el-dialog v-model="showDetail" :title="selectedClass?.title" width="480px">
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
              <span :class="statusColor[e.status]">{{ statusLabel[e.status] }}</span>
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

    <!-- 新增 / 編輯 Dialog -->
    <el-dialog v-model="showForm" :title="editingClass ? '編輯課程' : '新增課程'" width="480px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">課程名稱 *</label>
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
          <label class="block text-sm text-gray-600 mb-1">人數上限（選填）</label>
          <el-input v-model="form.max_students" type="number" min="1" placeholder="不填表示無限制" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">備註（選填）</label>
          <el-input v-model="form.notes" type="textarea" :rows="2" />
        </div>
        <div v-if="!editingClass">
          <label class="block text-sm text-gray-600 mb-1">邀請學員（送出後會傳 LINE 通知）</label>
          <el-select v-model="form.member_ids" multiple class="w-full" placeholder="選擇要邀請的學員">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm"
          style="background:#16a34a;border-color:#16a34a">
          {{ editingClass ? '更新' : '建立並通知' }}
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
