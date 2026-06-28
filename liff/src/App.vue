<script setup>
import { RouterView } from 'vue-router'
import { useUserStore } from './stores/user.js'

const store = useUserStore()
</script>

<template>
  <div v-if="store.initError" class="min-h-screen bg-green-500 flex flex-col items-center justify-center gap-4">
    <div class="text-white text-4xl">💪</div>
    <p class="text-white font-medium text-center px-6">{{ store.initError }}</p>
    <button
      v-if="store.gymId"
      @click="store.init()"
      class="bg-white text-green-600 font-semibold px-6 py-2 rounded-full text-sm"
    >
      重新連線
    </button>
  </div>

  <div v-else-if="store.loading" class="min-h-screen bg-green-500 flex flex-col items-center justify-center gap-3">
    <div class="text-white text-4xl">💪</div>
    <p class="text-white font-medium">Fit Track 載入中...</p>
  </div>

  <RouterView v-else />
</template>
