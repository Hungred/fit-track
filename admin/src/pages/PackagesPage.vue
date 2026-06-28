<script setup>
import { ref, onMounted } from 'vue'
import { coachApi } from '../api/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'

const packages = ref([])
const loading = ref(true)
const showCreate = ref(false)
const showEdit = ref(false)
const editingId = ref(null)
const form = ref({ name: '', total_sessions: '', price_per_session: '', price_total: '', valid_days: '' })
const submitting = ref(false)

async function fetchPackages() {
  loading.value = true
  try {
    const res = await coachApi.getPackages()
    packages.value = res.data.packages
  } catch {
    ElMessage.error('載入失敗')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { name: '', total_sessions: '', price_per_session: '', price_total: '', valid_days: '' }
  showCreate.value = true
}

function openEdit(pkg) {
  editingId.value = pkg.id
  form.value = {
    name: pkg.name,
    total_sessions: pkg.total_sessions,
    price_per_session: pkg.price_per_session || '',
    price_total: pkg.price_total || '',
    valid_days: pkg.valid_days || '',
  }
  showEdit.value = true
}

function formPayload() {
  return {
    name: form.value.name,
    total_sessions: Number(form.value.total_sessions),
    price_per_session: form.value.price_per_session ? Number(form.value.price_per_session) : null,
    price_total: form.value.price_total ? Number(form.value.price_total) : null,
    valid_days: form.value.valid_days ? Number(form.value.valid_days) : null,
  }
}

async function createPackage() {
  if (!form.value.name || !form.value.total_sessions) {
    ElMessage.warning('請填寫方案名稱與堂數')
    return
  }
  submitting.value = true
  try {
    await coachApi.createPackage(formPayload())
    ElMessage.success('方案建立成功')
    showCreate.value = false
    await fetchPackages()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '建立失敗')
  } finally {
    submitting.value = false
  }
}

async function updatePackage() {
  if (!form.value.name || !form.value.total_sessions) {
    ElMessage.warning('請填寫方案名稱與堂數')
    return
  }
  submitting.value = true
  try {
    await coachApi.updatePackage(editingId.value, formPayload())
    ElMessage.success('方案已更新')
    showEdit.value = false
    await fetchPackages()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '更新失敗')
  } finally {
    submitting.value = false
  }
}

async function deletePackage(pkg) {
  try {
    await ElMessageBox.confirm(`確定要刪除「${pkg.name}」嗎？`, '刪除方案', {
      confirmButtonText: '刪除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })
    await coachApi.deletePackage(pkg.id)
    ElMessage.success('已刪除')
    await fetchPackages()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.response?.data?.error || '刪除失敗')
  }
}

onMounted(fetchPackages)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">方案管理</h2>
      <el-button type="primary" @click="openCreate"
        style="background:#16a34a;border-color:#16a34a">
        ＋ 建立新方案
      </el-button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">載入中...</div>

    <div v-else class="grid grid-cols-3 gap-4">
      <div
        v-for="pkg in packages"
        :key="pkg.id"
        class="bg-white rounded-xl p-5 shadow-sm"
      >
        <div class="flex items-start justify-between mb-1">
          <h3 class="font-semibold text-gray-800">{{ pkg.name }}</h3>
          <span class="text-2xl font-bold text-green-600">{{ pkg.total_sessions }}</span>
        </div>
        <p class="text-xs text-gray-400 mb-3">堂數</p>
        <div class="space-y-1 text-sm text-gray-500">
          <div v-if="pkg.price_per_session" class="flex justify-between">
            <span>單堂售價</span>
            <span class="font-medium text-gray-700">NT$ {{ pkg.price_per_session }}</span>
          </div>
          <div v-if="pkg.price_total" class="flex justify-between">
            <span>整包售價</span>
            <span class="font-medium text-gray-700">NT$ {{ pkg.price_total }}</span>
          </div>
          <div v-if="pkg.valid_days" class="flex justify-between">
            <span>效期</span>
            <span class="font-medium text-gray-700">{{ pkg.valid_days }} 天</span>
          </div>
          <div v-if="!pkg.price_per_session && !pkg.price_total && !pkg.valid_days" class="text-gray-300 text-xs">
            未設定價格與效期
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <el-button size="small" class="flex-1" @click="openEdit(pkg)">✏️ 編輯</el-button>
          <el-button size="small" type="danger" @click="deletePackage(pkg)">🗑️ 刪除</el-button>
        </div>
      </div>

      <div v-if="!packages.length" class="col-span-3 text-center py-12 text-gray-400 bg-white rounded-xl">
        尚未建立任何方案，點右上角新增
      </div>
    </div>

    <!-- 建立方案 Dialog -->
    <el-dialog v-model="showCreate" title="建立堂數方案" width="400px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">方案名稱 *</label>
          <el-input v-model="form.name" placeholder="例如：10堂課包" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">堂數 *</label>
          <el-input v-model="form.total_sessions" type="number" placeholder="10" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">單堂售價（選填）</label>
          <el-input v-model="form.price_per_session" type="number" placeholder="350">
            <template #prepend>NT$</template>
          </el-input>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">整包售價（選填）</label>
          <el-input v-model="form.price_total" type="number" placeholder="3000">
            <template #prepend>NT$</template>
          </el-input>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">效期天數（選填，留空則永久有效）</label>
          <el-input v-model="form.valid_days" type="number" placeholder="90">
            <template #append>天</template>
          </el-input>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="createPackage"
          style="background:#16a34a;border-color:#16a34a">
          建立方案
        </el-button>
      </template>
    </el-dialog>

    <!-- 編輯方案 Dialog -->
    <el-dialog v-model="showEdit" title="編輯堂數方案" width="400px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">方案名稱 *</label>
          <el-input v-model="form.name" placeholder="例如：10堂課包" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">堂數 *</label>
          <el-input v-model="form.total_sessions" type="number" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">單堂售價（選填）</label>
          <el-input v-model="form.price_per_session" type="number">
            <template #prepend>NT$</template>
          </el-input>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">整包售價（選填）</label>
          <el-input v-model="form.price_total" type="number">
            <template #prepend>NT$</template>
          </el-input>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">效期天數（留空則永久有效）</label>
          <el-input v-model="form.valid_days" type="number">
            <template #append>天</template>
          </el-input>
        </div>
      </div>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="updatePackage"
          style="background:#16a34a;border-color:#16a34a">
          儲存變更
        </el-button>
      </template>
    </el-dialog>
  </Layout>
</template>
