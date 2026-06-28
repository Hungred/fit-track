<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { coachApi } from '../api/index.js'
import { ElMessage } from 'element-plus'
import Layout from '../components/Layout.vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const memberId = route.params.id

const member = ref(null)
const checkins = ref([])
const packages = ref([])
const allPackages = ref([])
const loading = ref(true)
const showAssign = ref(false)
const assignForm = ref({ package_id: '', expires_at: '' })
const submitting = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const [dashRes, checkinRes] = await Promise.all([
      coachApi.getDashboard(),
      coachApi.getCheckins({ member_id: memberId }),
    ])
    member.value = dashRes.data.members.find(m => m.id === memberId)
    checkins.value = checkinRes.data.checkins
    packages.value = member.value?.member_packages || []
  } catch (err) {
    if (err.response?.status !== 404) ElMessage.error('載入失敗')
    member.value = null
    checkins.value = []
    packages.value = []
  } finally {
    loading.value = false
  }
}

async function fetchPackages() {
  try {
    const res = await coachApi.getPackages()
    allPackages.value = res.data.packages
  } catch {
    // 靜默失敗，不影響頁面顯示
  }
}

async function assignPackage() {
  if (!assignForm.value.package_id) {
    ElMessage.warning('請選擇方案')
    return
  }
  submitting.value = true
  try {
    await coachApi.assignPackage({
      member_id: memberId,
      package_id: assignForm.value.package_id,
      expires_at: assignForm.value.expires_at || null,
    })
    ElMessage.success('方案指派成功')
    showAssign.value = false
    await fetchData()
    await fetchPackages()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '指派失敗')
  } finally {
    submitting.value = false
  }
}

async function adjustSessions(pkgId, delta) {
  try {
    await coachApi.adjustSessions(pkgId, { delta })
    ElMessage.success(delta > 0 ? `已新增 ${delta} 堂` : `已扣除 ${Math.abs(delta)} 堂`)
    await fetchData()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '調整失敗')
  }
}

onMounted(() => {
  fetchData()
  fetchPackages()
})
</script>

<template>
  <Layout>
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.back()" class="text-gray-400 hover:text-gray-600">← 返回</button>
      <h2 class="text-xl font-bold text-gray-800">{{ member?.name || '學員詳細' }}</h2>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">載入中...</div>

    <div v-else class="grid grid-cols-2 gap-6">
      <!-- 左欄：方案管理 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-700">堂數方案</h3>
          <el-button size="small" type="primary" @click="showAssign = true"
            style="background:#16a34a;border-color:#16a34a">
            ＋ 指派方案
          </el-button>
        </div>
        <div class="space-y-3">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="bg-white rounded-xl p-4 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-800">{{ pkg.package?.name }}</span>
              <span class="text-lg font-bold text-green-600">{{ pkg.remaining_sessions }} 堂</span>
            </div>
            <p v-if="pkg.expires_at" class="text-xs text-gray-400 mb-3">
              到期：{{ dayjs(pkg.expires_at).format('YYYY/MM/DD') }}
            </p>
            <div class="flex gap-2">
              <el-button size="small" @click="adjustSessions(pkg.id, 1)">＋ 1堂</el-button>
              <el-button size="small" @click="adjustSessions(pkg.id, -1)" :disabled="pkg.remaining_sessions <= 0">－ 1堂</el-button>
              <el-button size="small" @click="adjustSessions(pkg.id, 5)">＋ 5堂</el-button>
            </div>
          </div>
          <div v-if="!packages.length" class="text-center py-8 text-gray-400 bg-white rounded-xl">
            目前無方案
          </div>
        </div>
      </div>

      <!-- 右欄：出勤記錄 -->
      <div>
        <h3 class="font-semibold text-gray-700 mb-3">近期出勤記錄</h3>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
          <div v-if="!checkins.length" class="text-center py-8 text-gray-400">
            尚無出勤記錄
          </div>
          <div
            v-for="c in checkins.slice(0, 20)"
            :key="c.id"
            class="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
          >
            <div>
              <p class="text-sm font-medium text-gray-800">
                {{ dayjs(c.checked_in_at).format('MM/DD (ddd) HH:mm') }}
              </p>
              <p class="text-xs text-gray-400">{{ c.member_package?.package?.name }}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full"
              :class="c.method === 'manual' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'">
              {{ c.method === 'manual' ? '補登' : c.method === 'qr' ? 'QR' : '按鈕' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 指派方案 Dialog -->
    <el-dialog v-model="showAssign" title="指派堂數方案" width="400px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">選擇方案</label>
          <el-select v-model="assignForm.package_id" placeholder="請選擇方案" class="w-full">
            <el-option
              v-for="p in allPackages"
              :key="p.id"
              :label="`${p.name}（${p.total_sessions}堂）`"
              :value="p.id"
            />
          </el-select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">到期日（選填）</label>
          <el-input v-model="assignForm.expires_at" type="date" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showAssign = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="assignPackage"
          style="background:#16a34a;border-color:#16a34a">
          確認指派
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
