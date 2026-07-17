<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { authApi } from '../api/index.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const menuOpen = ref(false)

function logout() {
  auth.logout()
  router.push('/login')
}

// 切換頁面時自動關閉側欄
watch(() => route.path, () => { menuOpen.value = false })

const allNavItems = [
  { path: '/', label: '出勤總覽', icon: '📊', permission: null },
  { path: '/members', label: '學員管理', icon: '👥', permission: 'members:list' },
  { path: '/packages', label: '方案管理', icon: '📦', permission: 'packages:list' },
  { path: '/qr', label: 'QR Code 簽到', icon: '📷', permission: 'qr:generate' },
  { path: '/report', label: '月報表', icon: '📈', permission: 'report:view' },
  { path: '/classes', label: '排課管理', icon: '📅', permission: 'classes:view' },
  { path: '/coaches', label: '教練管理', icon: '🏋️', permission: 'coaches:list' },
  { path: '/spaces', label: '場地管理', icon: '🏢', permission: 'classes:view' },
  { path: '/space-bookings', label: '場地預約', icon: '📋', permission: 'classes:view' },
]

const navItems = computed(() =>
  allNavItems.filter(item => !item.permission || auth.hasPermission(item.permission))
)

const showChangePwd = ref(false)
const pwdForm = ref({ current: '', next: '', confirm: '' })
const pwdSubmitting = ref(false)

function openChangePwd() {
  pwdForm.value = { current: '', next: '', confirm: '' }
  menuOpen.value = false
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

    <!-- 手機頂部 header -->
    <header class="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 flex items-center px-4 z-30"
      style="height: calc(3.5rem + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top)">
      <button
        @click="menuOpen = !menuOpen"
        class="p-2 rounded-xl hover:bg-gray-100 transition-colors mr-3"
        aria-label="選單"
      >
        <div class="w-5 space-y-1.5">
          <span class="block h-0.5 bg-gray-600 rounded transition-all duration-200"
            :class="menuOpen ? 'rotate-45 translate-y-2' : ''" />
          <span class="block h-0.5 bg-gray-600 rounded transition-all duration-200"
            :class="menuOpen ? 'opacity-0' : ''" />
          <span class="block h-0.5 bg-gray-600 rounded transition-all duration-200"
            :class="menuOpen ? '-rotate-45 -translate-y-2' : ''" />
        </div>
      </button>
      <h1 class="text-base font-bold text-green-600">🏋️ Fit Track</h1>
    </header>

    <!-- Backdrop (手機側欄開啟時) -->
    <Transition name="fade">
      <div
        v-if="menuOpen"
        @click="menuOpen = false"
        class="lg:hidden fixed inset-0 bg-black/40 z-40"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed left-0 top-0 h-full w-64 lg:w-56 bg-white border-r border-gray-100 flex flex-col z-50
             transform transition-transform duration-200 ease-in-out
             lg:translate-x-0"
      :class="menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'"
    >
      <!-- Logo (桌面版顯示，手機版 header 已有) -->
      <div class="p-5 border-b border-gray-100 hidden lg:block">
        <router-link to="/" class="block">
          <h1 class="text-lg font-bold text-green-600">🏋️ Fit Track</h1>
          <p class="text-xs text-gray-400 mt-0.5">教練後台</p>
        </router-link>
      </div>
      <!-- 手機版 header 佔位 -->
      <div class="lg:hidden" style="height: calc(3.5rem + env(safe-area-inset-top))" />

      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path === item.path
            ? 'bg-green-50 text-green-700'
            : 'text-gray-600 hover:bg-gray-50'"
        >
          <span class="text-lg lg:text-base">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="p-3 border-t border-gray-100 space-y-1">
        <button
          @click="openChangePwd"
          class="w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🔑 變更密碼
        </button>
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🚪 登出
        </button>
      </div>
    </aside>

    <el-dialog v-model="showChangePwd" title="變更密碼" width="min(360px, 90vw)">
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
    <main class="lg:ml-56 p-4 lg:p-6 main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1023px) {
  .main-content {
    padding-top: calc(3.5rem + env(safe-area-inset-top) + 1rem) !important;
  }
}
</style>
