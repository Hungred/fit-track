<script setup>
import { ref, onMounted } from 'vue'
import { spaceApi, gymSettingsApi } from '../api/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'

const spaces = ref([])
const showForm = ref(false)
const submitting = ref(false)
const editingSpace = ref(null)

const settings = ref({ space_rental_rules: '', space_rental_pdf_url: '' })
const savingSettings = ref(false)
const uploadingPdf = ref(false)

async function handlePdfUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingPdf.value = true
  try {
    const res = await gymSettingsApi.uploadPdf(file)
    settings.value.space_rental_pdf_url = res.data.url
    ElMessage.success('PDF 上傳成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || 'PDF 上傳失敗')
  } finally {
    uploadingPdf.value = false
    e.target.value = ''
  }
}

async function loadSettings() {
  try {
    const res = await gymSettingsApi.getSpaceSettings()
    settings.value = { space_rental_rules: res.data.space_rental_rules || '', space_rental_pdf_url: res.data.space_rental_pdf_url || '' }
  } catch {}
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await gymSettingsApi.updateSpaceSettings(settings.value)
    ElMessage.success('租借規則已儲存')
  } catch {
    ElMessage.error('儲存失敗')
  } finally {
    savingSettings.value = false
  }
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

const emptyForm = () => ({
  name: '',
  description: '',
  price_per_hour: 300,
  capacity: '',
  available_days: [0, 1, 2, 3, 4, 5, 6],
  open_time: '08:00',
  close_time: '22:00',
})
const form = ref(emptyForm())

async function load() {
  const res = await spaceApi.listSpaces()
  spaces.value = res.data.spaces
}

function openCreate() {
  editingSpace.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(space) {
  editingSpace.value = space
  form.value = {
    name: space.name,
    description: space.description || '',
    price_per_hour: space.price_per_hour,
    capacity: space.capacity || '',
    available_days: space.available_days || [0,1,2,3,4,5,6],
    open_time: space.open_time?.slice(0, 5) || '08:00',
    close_time: space.close_time?.slice(0, 5) || '22:00',
  }
  showForm.value = true
}

async function submit() {
  if (!form.value.name) { ElMessage.warning('請填寫場地名稱'); return }
  submitting.value = true
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description || null,
      price_per_hour: Number(form.value.price_per_hour) || 0,
      capacity: form.value.capacity ? Number(form.value.capacity) : null,
      available_days: form.value.available_days,
      open_time: form.value.open_time,
      close_time: form.value.close_time,
    }
    if (editingSpace.value) {
      await spaceApi.updateSpace(editingSpace.value.id, payload)
      ElMessage.success('場地已更新')
    } else {
      await spaceApi.createSpace(payload)
      ElMessage.success('場地已新增')
    }
    showForm.value = false
    await load()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    submitting.value = false
  }
}

async function toggleActive(space) {
  try {
    await spaceApi.updateSpace(space.id, { is_active: !space.is_active })
    space.is_active = !space.is_active
    ElMessage.success(space.is_active ? '已開放' : '已關閉')
  } catch {
    ElMessage.error('操作失敗')
  }
}

async function remove(space) {
  await ElMessageBox.confirm(`確定刪除「${space.name}」？刪除後相關預約也會一起刪除。`, '確認刪除', { type: 'warning' })
  try {
    await spaceApi.deleteSpace(space.id)
    ElMessage.success('已刪除')
    await load()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

function dayLabel(space) {
  const days = (space.available_days || []).sort()
  if (days.length === 7) return '每天'
  if (days.length === 0) return '未設定'
  return days.map(d => `週${DAYS[d]}`).join('、')
}

onMounted(() => { load(); loadSettings() })
</script>

<template>
  <Layout>
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-800">場地管理</h1>
        <el-button type="primary" @click="openCreate" style="background:#16a34a;border-color:#16a34a">
          ＋ 新增場地
        </el-button>
      </div>

      <!-- 租借規則設定 -->
      <div class="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h2 class="font-semibold text-gray-800">📋 租借規則設定</h2>
        <p class="text-xs text-gray-400">學員點選 LINE 圖文選單「租借場地」時，會先收到此規則訊息。</p>
        <div>
          <label class="block text-sm text-gray-600 mb-1">規則說明</label>
          <el-input
            v-model="settings.space_rental_rules"
            type="textarea"
            :rows="4"
            placeholder="例：租借需提前 24 小時申請，最少租借 1 小時，使用完畢請恢復場地整潔…"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">規則 PDF（選填）</label>
          <div class="flex items-center gap-3">
            <label
              class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              :class="uploadingPdf && 'opacity-50 pointer-events-none'"
            >
              <span>{{ uploadingPdf ? '上傳中...' : '📄 選擇 PDF' }}</span>
              <input type="file" accept=".pdf" class="hidden" @change="handlePdfUpload" :disabled="uploadingPdf" />
            </label>
            <span v-if="settings.space_rental_pdf_url" class="text-xs text-green-600 truncate max-w-xs">
              ✅ 已上傳
              <a :href="settings.space_rental_pdf_url" target="_blank" class="underline ml-1">預覽</a>
            </span>
            <span v-else class="text-xs text-gray-400">尚未上傳</span>
          </div>
        </div>
        <div class="flex justify-end">
          <el-button :loading="savingSettings" @click="saveSettings" style="background:#7c3aed;border-color:#7c3aed;color:#fff">
            儲存規則
          </el-button>
        </div>
      </div>

      <div v-if="!spaces.length" class="text-center py-16 text-gray-400">
        <div class="text-4xl mb-3">🏢</div>
        <p>尚無場地，請新增</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="space in spaces"
          :key="space.id"
          class="bg-white rounded-2xl border border-gray-100 p-4 space-y-3"
          :class="!space.is_active && 'opacity-60'"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800">{{ space.name }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="space.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ space.is_active ? '開放中' : '已關閉' }}
                </span>
              </div>
              <p v-if="space.description" class="text-sm text-gray-500 mt-1">{{ space.description }}</p>
            </div>
            <div class="text-right shrink-0">
              <div class="text-lg font-bold text-purple-600">NT${{ space.price_per_hour }}</div>
              <div class="text-xs text-gray-400">/小時</div>
            </div>
          </div>

          <div class="text-xs text-gray-500 space-y-1">
            <div>📅 {{ dayLabel(space) }}</div>
            <div>🕐 {{ space.open_time?.slice(0,5) }} – {{ space.close_time?.slice(0,5) }}</div>
            <div v-if="space.capacity">👥 最多 {{ space.capacity }} 人</div>
          </div>

          <div class="flex gap-2 pt-1">
            <el-button size="small" @click="openEdit(space)">編輯</el-button>
            <el-button size="small" @click="toggleActive(space)">
              {{ space.is_active ? '關閉' : '開放' }}
            </el-button>
            <el-button size="small" type="danger" plain @click="remove(space)">刪除</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/編輯 Dialog -->
    <el-dialog
      v-model="showForm"
      :title="editingSpace ? '編輯場地' : '新增場地'"
      width="min(500px, 92vw)"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">場地名稱 *</label>
          <el-input v-model="form.name" placeholder="例：私人教練室 A" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">說明</label>
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="設備、空間大小…" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">時租金額 (NT$)</label>
            <el-input-number v-model="form.price_per_hour" :min="0" :step="50" class="w-full" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">最大人數</label>
            <el-input v-model="form.capacity" type="number" placeholder="不限" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-2">開放星期</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="(label, idx) in DAYS"
              :key="idx"
              class="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                :value="idx"
                v-model="form.available_days"
                class="accent-purple-600"
              />
              <span class="text-sm">週{{ label }}</span>
            </label>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">開放開始時間</label>
            <el-time-select v-model="form.open_time" start="00:00" end="23:00" step="00:30" class="w-full" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">開放結束時間</label>
            <el-time-select v-model="form.close_time" start="00:30" end="23:30" step="00:30" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit"
          style="background:#16a34a;border-color:#16a34a">
          {{ editingSpace ? '儲存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
