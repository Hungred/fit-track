<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()
const router = useRouter()
const uid = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!uid.value.trim()) {
    ElMessage.warning('請輸入 LINE UID')
    return
  }
  loading.value = true
  try {
    await auth.login(uid.value.trim())
    router.push('/')
  } catch {
    ElMessage.error('驗證失敗，請確認你的 LINE UID 是否為教練帳號')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">🏋️</div>
        <h1 class="text-2xl font-bold text-gray-800">Fit Track 教練後台</h1>
        <p class="text-gray-400 text-sm mt-2">請輸入你的 LINE UID 登入</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">LINE UID</label>
          <el-input
            v-model="uid"
            placeholder="U開頭的32位字串"
            size="large"
            @keyup.enter="handleLogin"
          />
          <p class="text-xs text-gray-400 mt-1">
            可在 Supabase members 表格中查詢你的 line_uid
          </p>
        </div>
        <el-button
          type="primary"
          size="large"
          class="w-full"
          :loading="loading"
          @click="handleLogin"
          style="background-color: #16a34a; border-color: #16a34a;"
        >
          登入後台
        </el-button>
      </div>
    </div>
  </div>
</template>
