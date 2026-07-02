<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)

const navItems = [
  { path: '/operator', label: '健身房管理', icon: '🏢' },
  { path: '/operator/logs', label: '操作日誌', icon: '📋' },
]

function logout() {
  localStorage.removeItem('operator_password')
  router.push('/operator/login')
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
      <h1 class="text-base font-bold text-blue-600">📓 Fit Track 營運後台</h1>
    </header>

    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="menuOpen"
        @click="menuOpen = false"
        class="lg:hidden fixed inset-0 bg-black/40 z-40"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-100 flex flex-col z-50
             transform transition-transform duration-200 ease-in-out lg:translate-x-0"
      :class="menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'"
    >
      <div class="p-5 border-b border-gray-100 hidden lg:block">
        <h1 class="text-base font-bold text-blue-600">📓 Fit Track</h1>
        <p class="text-xs text-gray-400 mt-0.5">營運後台</p>
      </div>
      <div class="lg:hidden" style="height: calc(3.5rem + env(safe-area-inset-top))" />

      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          @click="menuOpen = false"
          class="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path === item.path
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-50'"
        >
          <span class="text-lg lg:text-base">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="p-3 border-t border-gray-100">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          🚪 登出
        </button>
      </div>
    </aside>

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
    padding-top: calc(3.5rem + env(safe-area-inset-top)) !important;
  }
}
</style>
