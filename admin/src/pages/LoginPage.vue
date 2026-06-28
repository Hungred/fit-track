<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()
const router = useRouter()
const password = ref('')
const loading = ref(false)
const showPassword = ref(false)

async function handleLogin() {
  if (!password.value) {
    ElMessage.warning('請輸入密碼')
    return
  }
  loading.value = true
  try {
    await auth.login(password.value)
    router.push('/')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '登入失敗')
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
        <p class="text-gray-400 text-sm mt-2">請輸入管理密碼</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">管理密碼</label>
          <el-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="請輸入密碼"
            size="large"
            @keyup.enter="handleLogin"
          >
            <template #suffix>
              <span
                class="cursor-pointer text-gray-400 hover:text-gray-600 text-sm"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '隱藏' : '顯示' }}
              </span>
            </template>
          </el-input>
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
