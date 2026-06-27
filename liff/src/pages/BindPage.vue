<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { ElMessage } from 'element-plus'

const store = useUserStore()
const router = useRouter()

const form = ref({ name: '', phone: '' })
const loading = ref(false)

async function handleBind() {
  if (!form.value.name || !form.value.phone) {
    ElMessage.warning('請填寫姓名與電話')
    return
  }
  loading.value = true
  try {
    await store.bindMember(form.value.name, form.value.phone)
    ElMessage.success('綁定成功！')
    router.push('/')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '綁定失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">💪</div>
        <h1 class="text-2xl font-bold text-gray-800">歡迎加入 Fit Track</h1>
        <p class="text-gray-500 text-sm mt-2">請填寫以下資訊完成帳號綁定</p>
      </div>

      <el-form @submit.prevent="handleBind" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <el-input
            v-model="form.name"
            placeholder="請輸入你的姓名"
            size="large"
            prefix-icon="User"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">電話號碼</label>
          <el-input
            v-model="form.phone"
            placeholder="09XXXXXXXX"
            size="large"
            type="tel"
            prefix-icon="Phone"
          />
        </div>
        <el-button
          type="primary"
          size="large"
          class="w-full mt-2"
          :loading="loading"
          native-type="submit"
          @click="handleBind"
          style="background-color: #16a34a; border-color: #16a34a;"
        >
          完成綁定
        </el-button>
      </el-form>
    </div>
  </div>
</template>
