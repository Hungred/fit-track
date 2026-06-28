<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push('/login')
}

const navItems = [
  { path: '/', label: '出勤總覽', icon: '📊' },
  { path: '/packages', label: '方案管理', icon: '📦' },
  { path: '/qr', label: 'QR Code 簽到', icon: '📷' },
  { path: '/report', label: '月報表', icon: '📈' },
]
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
      <div class="p-3 border-t border-gray-100">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🚪 登出
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="ml-56 p-6">
      <slot />
    </main>
  </div>
</template>
