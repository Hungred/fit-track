<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { groupClassApi } from '../api/index.js'

const route = useRoute()
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'

const DAYS = ['日', '一', '二', '三', '四', '五', '六']
const STATUS_LABEL = { open: '招生中', active: '上課中', closed: '已結束' }
const STATUS_COLOR = { open: '#16a34a', active: '#2563eb', closed: '#9ca3af' }

// ── Group Classes ──
const classes = ref([])
const coaches = ref([])
const showClassForm = ref(false)
const classSubmitting = ref(false)
const editingClass = ref(null)

const emptyClassForm = () => ({
  name: '', description: '', coach_id: '',
  day_of_week: 5, start_time: '15:00', duration_minutes: 60,
  price_per_term: 4000, price_per_session: 500, sessions_per_term: 8, max_students: '',
})
const classForm = ref(emptyClassForm())

async function loadClasses() {
  const res = await groupClassApi.list()
  classes.value = res.data.group_classes
}

async function loadCoaches() {
  try {
    const { coachManageApi } = await import('../api/index.js')
    const res = await coachManageApi.list()
    coaches.value = res.data.coaches || []
  } catch {}
}

function openCreateClass() {
  editingClass.value = null
  classForm.value = emptyClassForm()
  showClassForm.value = true
}

function openEditClass(gc) {
  editingClass.value = gc
  classForm.value = {
    name: gc.name,
    description: gc.description || '',
    coach_id: gc.coach_id || '',
    day_of_week: gc.day_of_week ?? 5,
    start_time: gc.start_time?.slice(0, 5) || '15:00',
    duration_minutes: gc.duration_minutes || 60,
    price_per_term: gc.price_per_term || 0,
    price_per_session: gc.price_per_session || 0,
    sessions_per_term: gc.sessions_per_term || 8,
    max_students: gc.max_students || '',
  }
  showClassForm.value = true
}

async function submitClass() {
  if (!classForm.value.name) { ElMessage.warning('請填寫團課名稱'); return }
  classSubmitting.value = true
  try {
    const payload = {
      ...classForm.value,
      coach_id: classForm.value.coach_id || null,
      max_students: classForm.value.max_students ? Number(classForm.value.max_students) : null,
      day_of_week: Number(classForm.value.day_of_week),
      duration_minutes: Number(classForm.value.duration_minutes),
      price_per_term: Number(classForm.value.price_per_term),
      price_per_session: Number(classForm.value.price_per_session),
      sessions_per_term: Number(classForm.value.sessions_per_term),
    }
    if (editingClass.value) {
      await groupClassApi.update(editingClass.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await groupClassApi.create(payload)
      ElMessage.success('已新增')
    }
    showClassForm.value = false
    await loadClasses()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    classSubmitting.value = false
  }
}

async function removeClass(gc) {
  await ElMessageBox.confirm(`確定刪除「${gc.name}」？所有期別與報名也會一起刪除。`, '確認刪除', { type: 'warning' })
  try {
    await groupClassApi.delete(gc.id)
    ElMessage.success('已刪除')
    await loadClasses()
    if (selectedClass.value?.id === gc.id) selectedClass.value = null
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

async function toggleActive(gc) {
  await groupClassApi.update(gc.id, { is_active: !gc.is_active })
  gc.is_active = !gc.is_active
  ElMessage.success(gc.is_active ? '已開放' : '已關閉')
}

// ── Terms ──
const selectedClass = ref(null)
const terms = ref([])
const showTermForm = ref(false)
const termSubmitting = ref(false)
const termForm = ref({ start_date: '', notes: '' })

async function selectClass(gc) {
  selectedClass.value = gc
  await loadTerms()
}

async function loadTerms() {
  const res = await groupClassApi.listTerms(selectedClass.value.id)
  terms.value = res.data.terms
}

async function submitTerm() {
  if (!termForm.value.start_date) { ElMessage.warning('請選擇開始日期'); return }
  termSubmitting.value = true
  try {
    await groupClassApi.createTerm(selectedClass.value.id, termForm.value)
    ElMessage.success('期別已建立，課程時間已自動產生')
    showTermForm.value = false
    await loadTerms()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '建立失敗')
  } finally {
    termSubmitting.value = false
  }
}

async function updateTermStatus(term, status) {
  await groupClassApi.updateTerm(term.id, { status })
  term.status = status
  ElMessage.success('狀態已更新')
}

async function deleteTerm(term) {
  await ElMessageBox.confirm(`確定刪除第 ${term.term_number} 期？報名資料也會刪除。`, '確認刪除', { type: 'warning' })
  try {
    await groupClassApi.deleteTerm(term.id)
    ElMessage.success('已刪除')
    await loadTerms()
    if (selectedTerm.value?.id === term.id) selectedTerm.value = null
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

// ── Enrollments ──
const selectedTerm = ref(null)
const enrollments = ref([])

async function selectTerm(term) {
  selectedTerm.value = term
  const res = await groupClassApi.listEnrollments(term.id)
  enrollments.value = res.data.enrollments
}

async function togglePayment(enrollment) {
  const newStatus = enrollment.payment_status === 'paid' ? 'unpaid' : 'paid'
  await groupClassApi.updateEnrollment(enrollment.id, { payment_status: newStatus })
  enrollment.payment_status = newStatus
  ElMessage.success(newStatus === 'paid' ? '已標記付款' : '已取消付款')
}

async function removeEnrollment(enrollment) {
  const name = enrollment.member?.name || enrollment.renter_name
  await ElMessageBox.confirm(`確定移除「${name}」的報名？`, '確認移除', { type: 'warning' })
  try {
    await groupClassApi.deleteEnrollment(enrollment.id)
    ElMessage.success('已移除')
    enrollments.value = enrollments.value.filter(e => e.id !== enrollment.id)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '移除失敗')
  }
}

onMounted(async () => {
  await Promise.all([loadClasses(), loadCoaches()])

  const { classId, termId } = route.query
  if (!classId) return
  const gc = classes.value.find(c => c.id === classId)
  if (!gc) return
  await selectClass(gc)
  if (!termId) return
  const term = terms.value.find(t => t.id === termId)
  if (term) await selectTerm(term)
})
</script>

<template>
  <Layout>
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-800">團課管理</h1>
        <el-button type="primary" @click="openCreateClass" style="background:#7c3aed;border-color:#7c3aed">
          ＋ 新增團課
        </el-button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左欄：團課列表 -->
        <div class="space-y-3">
          <div v-if="!classes.length" class="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <div class="text-3xl mb-2">🏋️</div>
            <p class="text-sm">尚無團課</p>
          </div>
          <div
            v-for="gc in classes" :key="gc.id"
            class="bg-white rounded-2xl border p-4 cursor-pointer transition-all"
            :class="selectedClass?.id === gc.id ? 'border-purple-400 shadow-md' : 'border-gray-100 hover:border-gray-200'"
            @click="selectClass(gc)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-gray-800">{{ gc.name }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="gc.is_active ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500'">
                    {{ gc.is_active ? '開放中' : '已關閉' }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-1 space-y-0.5">
                  <div v-if="gc.day_of_week !== null">📅 每週{{ ['日','一','二','三','四','五','六'][gc.day_of_week] }} {{ gc.start_time?.slice(0,5) }}</div>
                  <div>🎯 每期 {{ gc.sessions_per_term }} 堂｜NT${{ gc.price_per_term.toLocaleString() }}</div>
                  <div v-if="gc.coach?.name">👤 {{ gc.coach.name }}</div>
                </div>
              </div>
            </div>
            <div class="flex gap-1.5 mt-3">
              <el-button size="small" @click.stop="openEditClass(gc)">編輯</el-button>
              <el-button size="small" @click.stop="toggleActive(gc)">{{ gc.is_active ? '關閉' : '開放' }}</el-button>
              <el-button size="small" type="danger" plain @click.stop="removeClass(gc)">刪除</el-button>
            </div>
          </div>
        </div>

        <!-- 中欄：期別 -->
        <div v-if="selectedClass" class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-700">{{ selectedClass.name }}｜期別</h2>
            <el-button size="small" @click="showTermForm = true; termForm = { start_date: '', notes: '' }" style="background:#7c3aed;border-color:#7c3aed;color:#fff">
              ＋ 開新期
            </el-button>
          </div>
          <div v-if="!terms.length" class="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
            尚無期別
          </div>
          <div
            v-for="term in terms" :key="term.id"
            class="bg-white rounded-2xl border p-4 cursor-pointer transition-all"
            :class="selectedTerm?.id === term.id ? 'border-purple-400 shadow-md' : 'border-gray-100 hover:border-gray-200'"
            @click="selectTerm(term)"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-gray-800">第 {{ term.term_number }} 期</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium text-white" :style="{ background: STATUS_COLOR[term.status] }">
                {{ STATUS_LABEL[term.status] }}
              </span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              📅 {{ term.start_date }}
              <span v-if="term.enrollments?.[0]?.count !== undefined">
                ｜報名 {{ term.enrollments[0].count }} 人
                <span v-if="selectedClass.max_students"> / {{ selectedClass.max_students }}</span>
              </span>
            </div>
            <div class="flex gap-1.5 mt-3">
              <el-select :model-value="term.status" size="small" style="width:100px" @change="updateTermStatus(term, $event)" @click.stop>
                <el-option label="招生中" value="open" />
                <el-option label="上課中" value="active" />
                <el-option label="已結束" value="closed" />
              </el-select>
              <el-button size="small" type="danger" plain @click.stop="deleteTerm(term)">刪除</el-button>
            </div>
          </div>
        </div>
        <div v-else class="hidden lg:flex items-center justify-center text-gray-300 text-sm">
          ← 選擇左側團課查看期別
        </div>

        <!-- 右欄：報名名單 -->
        <div v-if="selectedTerm">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-700">第 {{ selectedTerm.term_number }} 期｜報名名單</h2>
            <span class="text-xs text-gray-500">{{ enrollments.length }} 人</span>
          </div>
          <div v-if="!enrollments.length" class="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
            尚無報名
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="e in enrollments" :key="e.id"
              class="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <div class="font-medium text-sm text-gray-800 truncate">
                  {{ e.member?.name || e.renter_name || '未知' }}
                </div>
                <div class="text-xs text-gray-400">{{ e.member?.phone || e.renter_phone }}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="text-xs px-2 py-0.5 rounded-full cursor-pointer font-medium"
                  :class="e.payment_status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'"
                  @click="togglePayment(e)"
                >
                  {{ e.payment_status === 'paid' ? '已付款' : '未付款' }}
                </span>
                <el-button size="small" type="danger" plain @click="removeEnrollment(e)">移除</el-button>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="selectedClass" class="hidden lg:flex items-center justify-center text-gray-300 text-sm">
          ← 選擇期別查看報名名單
        </div>
      </div>
    </div>

    <!-- 新增/編輯團課 Dialog -->
    <el-dialog v-model="showClassForm" :title="editingClass ? '編輯團課' : '新增團課'" width="min(520px, 92vw)">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">團課名稱 *</label>
          <el-input v-model="classForm.name" placeholder="例：肌力團課" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">說明</label>
          <el-input v-model="classForm.description" type="textarea" :rows="2" placeholder="課程介紹、適合對象…" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">負責教練</label>
          <el-select v-model="classForm.coach_id" placeholder="請選擇教練" class="w-full" clearable>
            <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">上課星期</label>
            <el-select v-model="classForm.day_of_week" class="w-full">
              <el-option v-for="(d, i) in ['日','一','二','三','四','五','六']" :key="i" :label="`每週${d}`" :value="i" />
            </el-select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">上課時間</label>
            <el-time-select v-model="classForm.start_time" start="06:00" end="22:00" step="00:30" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">每期堂數</label>
            <el-input-number v-model="classForm.sessions_per_term" :min="1" :max="52" class="w-full" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">每期費用</label>
            <el-input-number v-model="classForm.price_per_term" :min="0" :step="500" class="w-full" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">每堂費用</label>
            <el-input-number v-model="classForm.price_per_session" :min="0" :step="100" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">人數上限</label>
            <el-input v-model="classForm.max_students" type="number" placeholder="不限" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">每堂時長（分鐘）</label>
            <el-input-number v-model="classForm.duration_minutes" :min="30" :step="30" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showClassForm = false">取消</el-button>
        <el-button type="primary" :loading="classSubmitting" @click="submitClass"
          style="background:#7c3aed;border-color:#7c3aed">
          {{ editingClass ? '儲存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 開新期 Dialog -->
    <el-dialog v-model="showTermForm" title="開新期" width="min(400px, 92vw)">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">開始日期 *</label>
          <el-date-picker v-model="termForm.start_date" type="date" value-format="YYYY-MM-DD"
            placeholder="選擇第一堂上課日期" class="w-full" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">備註</label>
          <el-input v-model="termForm.notes" placeholder="例：第一期招生，優惠價…" />
        </div>
        <p class="text-xs text-gray-400">
          系統會自動依上課星期產生 {{ selectedClass?.sessions_per_term }} 堂課程時間
        </p>
      </div>
      <template #footer>
        <el-button @click="showTermForm = false">取消</el-button>
        <el-button type="primary" :loading="termSubmitting" @click="submitTerm"
          style="background:#7c3aed;border-color:#7c3aed">建立</el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
