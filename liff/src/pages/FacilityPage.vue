<script setup>
import { ref, onMounted } from 'vue'
import { facilityApi } from '../api/index.js'

const photos = ref([])
const loading = ref(true)
const error = ref('')

const lightboxIndex = ref(-1)
const lightboxOpen = ref(false)

function openLightbox(i) {
  lightboxIndex.value = i
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function prevPhoto() {
  lightboxIndex.value = (lightboxIndex.value - 1 + photos.value.length) % photos.value.length
}

function nextPhoto() {
  lightboxIndex.value = (lightboxIndex.value + 1) % photos.value.length
}

onMounted(async () => {
  try {
    const res = await facilityApi.list()
    photos.value = res.data.photos || []
  } catch {
    error.value = '載入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-slate-700 text-white px-5 pt-14 pb-5">
      <h1 class="text-xl font-bold">場地介紹</h1>
      <p class="text-sm text-slate-300 mt-1">歡迎參觀我們的場館環境</p>
    </div>

    <div class="px-4 py-5 max-w-lg mx-auto">
      <div v-if="loading" class="text-center py-20 text-gray-400">載入中…</div>
      <div v-else-if="error" class="text-center py-20 text-red-400 text-sm">{{ error }}</div>
      <div v-else-if="!photos.length" class="text-center py-20 text-gray-400 text-sm">尚無照片</div>

      <div v-else class="grid grid-cols-2 gap-2">
        <button
          v-for="(url, i) in photos" :key="url"
          @click="openLightbox(i)"
          class="aspect-square rounded-xl overflow-hidden bg-gray-100"
        >
          <img :src="url" loading="lazy" class="w-full h-full object-cover" />
        </button>
      </div>
    </div>

    <!-- Lightbox -->
    <div
      v-if="lightboxOpen"
      class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      @click="closeLightbox"
    >
      <button
        @click.stop="closeLightbox"
        class="absolute top-5 right-5 text-white text-2xl w-10 h-10 flex items-center justify-center"
      >✕</button>

      <button
        v-if="photos.length > 1"
        @click.stop="prevPhoto"
        class="absolute left-2 text-white text-3xl w-12 h-12 flex items-center justify-center"
      >‹</button>

      <img
        :src="photos[lightboxIndex]"
        class="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
        @click.stop
      />

      <button
        v-if="photos.length > 1"
        @click.stop="nextPhoto"
        class="absolute right-2 text-white text-3xl w-12 h-12 flex items-center justify-center"
      >›</button>

      <div v-if="photos.length > 1" class="absolute bottom-6 text-white text-sm">
        {{ lightboxIndex + 1 }} / {{ photos.length }}
      </div>
    </div>
  </div>
</template>
