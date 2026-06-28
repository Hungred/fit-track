<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { coachApi } from '../api/index.js'
import { ElMessage } from 'element-plus'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const router = useRouter()
const members = ref([])
const loading = ref(true)
const search = ref('')
const showManualCheckin = ref(false)
const manualForm = ref({ member_id: '', date: dayjs().format('YYYY-MM-DDTHH:mm'), notes: '' })
const submitting = ref(false)
const todayLeaveIds = ref(new Set())

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return members.value.filter(m => m.name.toLowerCase().includes(q) || m.phone?.includes(q))
})

const todayCheckedIn = computed(() => members.value.filter(m => m.checked_in_today).length)
const todayLeaveCount = computed(() => todayLeaveIds.value.size)

async function fetchDashboard() {
  loading.value = true
  try {
    const [dashRes, leaveRes] = await Promise.all([
      coachApi.getDashboard(),
      coachApi.getTodayLeaves(),
    ])
    members.value = dashRes.data.members
    todayLeaveIds.value = new Set(leaveRes.data.leaves.map(l => l.member?.id))
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
  }
}

async function submitManualCheckin() {
  if (!manualForm.value.member_id) {
    ElMessage.warning('請選擇學員')
    return
  }
  submitting.value = true
  try {
    await coachApi.manualCheckin({
      member_id: manualForm.value.member_id,
      date: manualForm.value.date,
      notes: manualForm.value.notes,
    })
    ElMessage.success('補登成功')
    showManualCheckin.value = false
    await fetchDashboard()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '補登失敗')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <Layout>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">出勤總覽</h2>
        <p class="text-sm text-gray-400 mt-0.5">{{ dayjs().format('YYYY年MM月DD日') }}</p>
      </div>
      <el-button type="primary" @click="showManualCheckin = true" style="background:#16a34a;border-color:#16a34a">
        ＋ 手動補登
      </el-button>
    </div>

    <!-- 統計卡 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm text-gray-400">總學員數</p>
        <p class="text-3xl font-bold text-gray-800 mt-1">{{ members.length }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm text-gray-400">今日簽到</p>
        <p class="text-3xl font-bold text-green-600 mt-1">{{ todayCheckedIn }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm text-gray-400">今日請假</p>
        <p class="text-3xl font-bold text-orange-400 mt-1">{{ todayLeaveCount }}</p>
      </div>
    </div>

    <!-- 搜尋 -->
    <el-input v-model="search" placeholder="搜尋學員姓名或電話..." class="mb-4" clearable />

    <!-- 學員列表 -->
    <div v-if="loading" class="text-center py-12 text-gray-400">載入中...</div>
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th class="text-left px-5 py-3">學員</th>
            <th class="text-left px-5 py-3">今日</th>
            <th class="text-left px-5 py-3">有效方案</th>
            <th class="text-left px-5 py-3">剩餘堂數</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in filtered"
            :key="m.id"
            class="border-t border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <td class="px-5 py-3.5">
              <p class="font-medium text-gray-800">{{ m.name }}</p>
              <p class="text-gray-400 text-xs">{{ m.phone }}</p>
            </td>
            <td class="px-5 py-3.5">
              <span v-if="m.checked_in_today" class="text-green-500 font-medium">✅ 已簽到</span>
              <span v-else-if="todayLeaveIds.has(m.id)" class="text-orange-400 font-medium">🏖️ 請假</span>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-5 py-3.5">
              <span v-if="m.active_packages?.length" class="text-gray-600">
                {{ m.active_packages.length }} 個方案
              </span>
              <span v-else class="text-red-400 text-xs">無有效方案</span>
            </td>
            <td class="px-5 py-3.5">
              <span class="font-semibold text-green-600">
                {{ m.active_packages?.reduce((s, p) => s + p.remaining_sessions, 0) || 0 }}
              </span> 堂
            </td>
            <td class="px-5 py-3.5 text-right">
              <el-button size="small" @click="router.push(`/members/${m.id}`)">
                管理
              </el-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 手動補登 Dialog -->
    <el-dialog v-model="showManualCheckin" title="手動補登" width="400px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">選擇學員</label>
          <el-select v-model="manualForm.member_id" placeholder="請選擇" class="w-full">
            <el-option
              v-for="m in members"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            />
          </el-select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">補登時間</label>
          <el-input v-model="manualForm.date" type="datetime-local" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">備註（選填）</label>
          <el-input v-model="manualForm.notes" placeholder="例如：學員忘記簽到" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showManualCheckin = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitManualCheckin"
          style="background:#16a34a;border-color:#16a34a">
          確認補登
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
