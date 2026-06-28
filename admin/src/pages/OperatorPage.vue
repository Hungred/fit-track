<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { operatorApi } from '../api/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const gyms = ref([])
const loading = ref(true)
const showForm = ref(false)
const editingGym = ref(null)
const submitting = ref(false)

const emptyForm = () => ({
  name: '', line_channel_secret: '', line_channel_access_token: '', liff_id: '', admin_password: '', status: 'active'
})
const form = ref(emptyForm())

async function fetchGyms() {
  loading.value = true
  try {
    const res = await operatorApi.listGyms()
    gyms.value = res.data.gyms
  } catch {
    ElMessage.error('載入失敗，請重新登入')
    router.push('/operator/login')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingGym.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(gym) {
  editingGym.value = gym
  form.value = {
    name: gym.name,
    line_channel_secret: '',
    line_channel_access_token: '',
    liff_id: gym.liff_id || '',
    admin_password: '',
    status: gym.status,
  }
  showForm.value = true
}

async function submitForm() {
  if (!form.value.name) { ElMessage.warning('請填寫健身房名稱'); return }
  if (!editingGym.value && !form.value.admin_password) { ElMessage.warning('請設定後台密碼'); return }

  submitting.value = true
  try {
    const payload = { ...form.value }
    if (!payload.line_channel_secret) delete payload.line_channel_secret
    if (!payload.line_channel_access_token) delete payload.line_channel_access_token
    if (!payload.admin_password) delete payload.admin_password

    if (editingGym.value) {
      await operatorApi.updateGym(editingGym.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await operatorApi.createGym(payload)
      ElMessage.success('新增成功')
    }
    showForm.value = false
    await fetchGyms()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(gym) {
  const newStatus = gym.status === 'active' ? 'suspended' : 'active'
  const label = newStatus === 'active' ? '啟用' : '停用'
  await ElMessageBox.confirm(`確定要${label}「${gym.name}」嗎？`, '確認', { type: 'warning' })
  await operatorApi.updateGym(gym.id, { status: newStatus })
  ElMessage.success(`已${label}`)
  await fetchGyms()
}

function copyGymLink(gym) {
  const url = `${window.location.origin}/?gym=${gym.id}`
  navigator.clipboard.writeText(url)
  ElMessage.success('後台連結已複製')
}

function logout() {
  localStorage.removeItem('operator_password')
  router.push('/operator/login')
}

onMounted(fetchGyms)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-blue-600">🏢 Fit Track 營運後台</h1>
        <p class="text-xs text-gray-400">健身房管理</p>
      </div>
      <div class="flex gap-3">
        <el-button type="primary" @click="openCreate" style="background:#2563eb;border-color:#2563eb">
          ＋ 新增健身房
        </el-button>
        <el-button @click="logout">登出</el-button>
      </div>
    </div>

    <div class="p-6">
      <!-- 統計 -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p class="text-sm text-gray-400 mb-1">健身房總數</p>
          <p class="text-4xl font-bold text-blue-600">{{ gyms.length }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p class="text-sm text-gray-400 mb-1">營運中</p>
          <p class="text-4xl font-bold text-green-500">{{ gyms.filter(g => g.status === 'active').length }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p class="text-sm text-gray-400 mb-1">本月總出勤</p>
          <p class="text-4xl font-bold text-purple-500">{{ gyms.reduce((s, g) => s + g.month_checkins, 0) }}</p>
        </div>
      </div>

      <!-- 健身房列表 -->
      <div v-if="loading" class="text-center py-16 text-gray-400">載入中...</div>
      <div v-else class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th class="text-left px-5 py-3">健身房名稱</th>
              <th class="text-left px-5 py-3">學員數</th>
              <th class="text-left px-5 py-3">本月出勤</th>
              <th class="text-left px-5 py-3">狀態</th>
              <th class="text-left px-5 py-3">建立時間</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gym in gyms" :key="gym.id"
              class="border-t border-gray-50 hover:bg-gray-50 transition-colors">
              <td class="px-5 py-3.5 font-medium text-gray-800">{{ gym.name }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ gym.member_count }} 人</td>
              <td class="px-5 py-3.5 text-green-600 font-semibold">{{ gym.month_checkins }} 次</td>
              <td class="px-5 py-3.5">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="gym.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'">
                  {{ gym.status === 'active' ? '營運中' : '已停用' }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-gray-400 text-xs">{{ dayjs(gym.created_at).format('YYYY/MM/DD') }}</td>
              <td class="px-5 py-3.5">
                <div class="flex gap-2 justify-end">
                  <el-button size="small" @click="copyGymLink(gym)">複製連結</el-button>
                  <el-button size="small" @click="openEdit(gym)">編輯</el-button>
                  <el-button size="small" :type="gym.status === 'active' ? 'danger' : 'success'"
                    @click="toggleStatus(gym)">
                    {{ gym.status === 'active' ? '停用' : '啟用' }}
                  </el-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!gyms.length" class="text-center py-12 text-gray-400">尚無健身房</div>
      </div>
    </div>

    <!-- 新增/編輯 Dialog -->
    <el-dialog v-model="showForm" :title="editingGym ? '編輯健身房' : '新增健身房'" width="500px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">健身房名稱 *</label>
          <el-input v-model="form.name" placeholder="例如：Heavenfit Studio" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">後台管理密碼 {{ editingGym ? '（不填則不更新）' : '*' }}</label>
          <el-input v-model="form.admin_password" type="password" placeholder="教練登入後台用的密碼" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">LINE Channel Secret {{ editingGym ? '（不填則不更新）' : '' }}</label>
          <el-input v-model="form.line_channel_secret" placeholder="LINE Messaging API channel secret" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">LINE Channel Access Token {{ editingGym ? '（不填則不更新）' : '' }}</label>
          <el-input v-model="form.line_channel_access_token" type="textarea" :rows="3" placeholder="LINE channel access token" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">LIFF ID</label>
          <el-input v-model="form.liff_id" placeholder="LINE Login channel LIFF ID" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm"
          style="background:#2563eb;border-color:#2563eb">
          {{ editingGym ? '更新' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
