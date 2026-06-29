<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { authApi } from '../api/index.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push('/login')
}

const allNavItems = [
  { path: '/', label: '出勤總覽', icon: '📊', permission: null },
  { path: '/members', label: '學員管理', icon: '👥', permission: 'members:list' },
  { path: '/packages', label: '方案管理', icon: '📦', permission: 'packages:list' },
  { path: '/qr', label: 'QR Code 簽到', icon: '📷', permission: 'qr:generate' },
  { path: '/report', label: '月報表', icon: '📈', permission: 'report:view' },
  { path: '/coaches', label: '教練管理', icon: '🏋️', permission: 'coaches:list' },
]

const navItems = computed(() =>
  allNavItems.filter(item => !item.permission || auth.hasPermission(item.permission))
)

const showChangePwd = ref(false)
const pwdForm = ref({ current: '', next: '', confirm: '' })
const pwdSubmitting = ref(false)

function openChangePwd() {
  pwdForm.value = { current: '', next: '', confirm: '' }
  showChangePwd.value = true
}

async function submitChangePwd() {
  if (!pwdForm.value.current || !pwdForm.value.next) {
    ElMessage.warning('請填寫所有欄位')
    return
  }
  if (pwdForm.value.next !== pwdForm.value.confirm) {
    ElMessage.warning('新密碼與確認密碼不一致')
    return
  }
  pwdSubmitting.value = true
  try {
    await authApi.changePassword(pwdForm.value.current, pwdForm.value.next)
    ElMessage.success('密碼已更新')
    showChangePwd.value = false
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '更新失敗')
  } finally {
    pwdSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-100 flex flex-col">
      <div class="p-5 border-b border-gray-100">
        <router-link to="/" class="block">
          <h1 class="text-lg font-bold text-green-600">💪 Fit Track</h1>
          <p class="text-xs text-gray-400 mt-0.5">教練後台</p>
        </router-link>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path === item.path
            ? 'bg-green-50 text-green-700'
            : 'text-gray-600 hover:bg-gray-50'"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>
      <div class="p-3 border-t border-gray-100 space-y-1">
        <button
          @click="openChangePwd"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🔑 變更密碼
        </button>
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🚪 登出
        </button>
      </div>
    </aside>

    <el-dialog v-model="showChangePwd" title="變更密碼" width="360px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">目前密碼</label>
          <el-input v-model="pwdForm.current" type="password" show-password placeholder="請輸入目前密碼" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">新密碼</label>
          <el-input v-model="pwdForm.next" type="password" show-password placeholder="至少 6 個字元" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">確認新密碼</label>
          <el-input v-model="pwdForm.confirm" type="password" show-password placeholder="再輸入一次新密碼" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showChangePwd = false">取消</el-button>
        <el-button type="primary" :loading="pwdSubmitting" @click="submitChangePwd"
          style="background:#16a34a;border-color:#16a34a">
          確認更新
        </el-button>
      </template>
    </el-dialog>

    <!-- Main content -->
    <main class="ml-56 p-6">
      <slot />
    </main>
  </div>
</template>
