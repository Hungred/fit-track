<script setup>
import { ref, onMounted } from 'vue'
import { coachManageApi } from '../api/index.js'
import { useAuthStore } from '../stores/auth.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'

const auth = useAuthStore()
const coaches = ref([])
const loading = ref(true)
const showForm = ref(false)
const editingCoach = ref(null)
const submitting = ref(false)

const PERMISSION_GROUPS = [
  { label: '出勤總覽', items: [
    { key: 'dashboard:view', label: '查看今日統計' },
    { key: 'dashboard:checkin_manual', label: '手動補登' },
  ]},
  { label: '學員管理', items: [
    { key: 'members:list', label: '查看學員列表' },
    { key: 'members:view', label: '查看學員詳細頁' },
    { key: 'members:assign_package', label: '指派方案' },
    { key: 'members:delete_package', label: '刪除學員方案' },
    { key: 'members:adjust_sessions', label: '調整堂數' },
  ]},
  { label: '方案管理', items: [
    { key: 'packages:list', label: '查看方案列表' },
    { key: 'packages:create', label: '新增方案' },
    { key: 'packages:edit', label: '編輯方案' },
    { key: 'packages:delete', label: '刪除方案' },
  ]},
  { label: 'QR 簽到', items: [
    { key: 'qr:generate', label: '產生 QR Code' },
  ]},
  { label: '月報表', items: [
    { key: 'report:view', label: '查看月報表' },
  ]},
  { label: '排課管理', items: [
    { key: 'classes:view', label: '查看課程月曆' },
    { key: 'classes:create', label: '新增課程' },
    { key: 'classes:edit', label: '編輯課程' },
    { key: 'classes:delete', label: '刪除課程' },
  ]},
  { label: '教練管理', items: [
    { key: 'coaches:list', label: '查看教練列表' },
    { key: 'coaches:create', label: '新增教練' },
    { key: 'coaches:edit', label: '編輯教練' },
    { key: 'coaches:delete', label: '刪除教練' },
  ]},
]

const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key))
const PRESET_FULL = ALL_PERMS.filter(k => !k.startsWith('coaches:'))
const PRESET_BASIC = ['dashboard:view', 'dashboard:checkin_manual', 'members:list', 'members:view', 'qr:generate']

const emptyForm = () => ({ name: '', username: '', password: '', confirm: '', permissions: [] })
const form = ref(emptyForm())

async function fetchCoaches() {
  loading.value = true
  try {
    const res = await coachManageApi.list()
    coaches.value = res.data.coaches
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingCoach.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(coach) {
  editingCoach.value = coach
  form.value = { name: coach.name, username: coach.username, password: '', confirm: '', permissions: [...(coach.permissions || [])] }
  showForm.value = true
}

function applyPreset(preset) {
  if (preset === 'full') form.value.permissions = [...PRESET_FULL]
  else if (preset === 'basic') form.value.permissions = [...PRESET_BASIC]
  else form.value.permissions = []
}

async function submitForm() {
  if (!form.value.name || !form.value.username) {
    ElMessage.warning('請填寫姓名與帳號')
    return
  }
  if (!editingCoach.value && !form.value.password) {
    ElMessage.warning('請設定密碼')
    return
  }
  if (form.value.password && form.value.password !== form.value.confirm) {
    ElMessage.warning('密碼與確認密碼不一致')
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: form.value.name,
      username: form.value.username,
      permissions: form.value.permissions,
    }
    if (form.value.password) payload[editingCoach.value ? 'new_password' : 'password'] = form.value.password

    if (editingCoach.value) {
      await coachManageApi.update(editingCoach.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await coachManageApi.create(payload)
      ElMessage.success('新增成功')
    }
    showForm.value = false
    await fetchCoaches()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失敗')
  } finally {
    submitting.value = false
  }
}

async function deleteCoach(coach) {
  await ElMessageBox.confirm(`確定要刪除教練「${coach.name}」嗎？`, '確認刪除', { type: 'warning' })
  try {
    await coachManageApi.delete(coach.id)
    ElMessage.success('已刪除')
    await fetchCoaches()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

onMounted(fetchCoaches)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">教練管理</h2>
      <el-button
        v-if="auth.hasPermission('coaches:create')"
        type="primary"
        @click="openCreate"
        style="background:#16a34a;border-color:#16a34a"
      >
        ＋ 新增教練
      </el-button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">載入中...</div>
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th class="text-left px-5 py-3">姓名</th>
            <th class="text-left px-5 py-3">帳號</th>
            <th class="text-left px-5 py-3">身份</th>
            <th class="text-left px-5 py-3">權限數</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="coach in coaches"
            :key="coach.id"
            class="border-t border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <td class="px-5 py-3.5 font-medium text-gray-800">{{ coach.name }}</td>
            <td class="px-5 py-3.5 text-gray-500">{{ coach.username }}</td>
            <td class="px-5 py-3.5">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="coach.is_owner ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'"
              >
                {{ coach.is_owner ? '主教練' : '教練' }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-gray-500">{{ coach.is_owner ? '全部' : `${(coach.permissions || []).length} 項` }}</td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex gap-2 justify-end">
                <el-button
                  v-if="auth.hasPermission('coaches:edit')"
                  size="small"
                  @click="openEdit(coach)"
                >
                  編輯
                </el-button>
                <el-button
                  v-if="auth.hasPermission('coaches:delete') && !coach.is_owner && coach.id !== auth.lineUid"
                  size="small"
                  type="danger"
                  @click="deleteCoach(coach)"
                >
                  刪除
                </el-button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!coaches.length" class="text-center py-12 text-gray-400">尚無其他教練</div>
    </div>

    <!-- 新增 / 編輯 Dialog -->
    <el-dialog v-model="showForm" :title="editingCoach ? '編輯教練' : '新增教練'" width="520px">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">姓名 *</label>
            <el-input v-model="form.name" placeholder="教練姓名" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">帳號 *</label>
            <el-input v-model="form.username" placeholder="登入帳號" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ editingCoach ? '新密碼（留空不修改）' : '密碼 *' }}</label>
            <el-input v-model="form.password" type="password" show-password placeholder="至少 6 個字元" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">確認密碼</label>
            <el-input v-model="form.confirm" type="password" show-password placeholder="再輸入一次" />
          </div>
        </div>

        <!-- 權限 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm text-gray-600">權限設定</label>
            <div class="flex gap-2">
              <el-button size="small" @click="applyPreset('full')">全權教練</el-button>
              <el-button size="small" @click="applyPreset('basic')">基礎教練</el-button>
              <el-button size="small" @click="applyPreset('none')">清除</el-button>
            </div>
          </div>
          <div class="border border-gray-100 rounded-xl p-4 space-y-4 max-h-72 overflow-y-auto">
            <div v-for="group in PERMISSION_GROUPS" :key="group.label">
              <p class="text-xs font-semibold text-gray-500 mb-2">{{ group.label }}</p>
              <div class="grid grid-cols-2 gap-1.5">
                <el-checkbox
                  v-for="item in group.items"
                  :key="item.key"
                  v-model="form.permissions"
                  :label="item.key"
                  :value="item.key"
                  class="!m-0 text-sm"
                >
                  {{ item.label }}
                </el-checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm"
          style="background:#16a34a;border-color:#16a34a">
          {{ editingCoach ? '更新' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
