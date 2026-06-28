<script setup>
import { ref, onMounted } from 'vue'
import { coachApi } from '../api/index.js'
import { ElMessage } from 'element-plus'
import Layout from '../components/Layout.vue'

const packages = ref([])
const loading = ref(true)
const showCreate = ref(false)
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

async function createPackage() {
  if (!form.value.name || !form.value.total_sessions) {
    ElMessage.warning('請填寫方案名稱與堂數')
    return
  }
  submitting.value = true
  try {
    await coachApi.createPackage({
      name: form.value.name,
      total_sessions: Number(form.value.total_sessions),
      price_per_session: form.value.price_per_session ? Number(form.value.price_per_session) : null,
      price_total: form.value.price_total ? Number(form.value.price_total) : null,
      valid_days: form.value.valid_days ? Number(form.value.valid_days) : null,
    })
    ElMessage.success('方案建立成功')
    showCreate.value = false
    form.value = { name: '', total_sessions: '', price_per_session: '', price_total: '', valid_days: '' }
    await fetchPackages()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '建立失敗')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchPackages)
</script>

<template>
  <Layout>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-800">方案管理</h2>
      <el-button type="primary" @click="showCreate = true"
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
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-semibold text-gray-800">{{ pkg.name }}</h3>
          <span class="text-2xl font-bold text-green-600">{{ pkg.total_sessions }}</span>
        </div>
        <p class="text-sm text-gray-400">堂數</p>
        <div class="mt-3 space-y-1 text-sm text-gray-500">
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
  </Layout>
</template>
