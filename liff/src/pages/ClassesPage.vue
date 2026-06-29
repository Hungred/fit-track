<script setup>
import { ref, onMounted } from 'vue'
import { classApi } from '../api/index.js'
import { useUserStore } from '../stores/user.js'
import dayjs from 'dayjs'

const store = useUserStore()
const enrollments = ref([])
const loading = ref(true)

const statusLabel = { pending: '待確認', confirmed: '確認出席', leave: '請假', discuss: '討論中' }
const statusColor = {
  pending: 'bg-gray-100 text-gray-500',
  confirmed: 'bg-green-50 text-green-600',
  leave: 'bg-orange-50 text-orange-500',
  discuss: 'bg-blue-50 text-blue-500',
}

function googleCalendarUrl(cls) {
  const start = dayjs(cls.start_at).format('YYYYMMDDTHHmmss')
  const end = cls.end_at
    ? dayjs(cls.end_at).format('YYYYMMDDTHHmmss')
    : dayjs(cls.start_at).add(1, 'hour').format('YYYYMMDDTHHmmss')
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cls.title)}&dates=${start}/${end}&details=${encodeURIComponent(cls.notes || '')}`
}

function icalUrl(classId) {
  return `${import.meta.env.VITE_API_URL}/api/classes/${classId}/ical`
}

onMounted(async () => {
  try {
    const res = await classApi.getMyClasses()
    enrollments.value = res.data.enrollments || []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-8">
    <div class="bg-green-500 px-5 pt-10 pb-6">
      <h1 class="text-white text-xl font-bold">我的課程</h1>
      <p class="text-green-100 text-sm mt-1">{{ store.member?.name }}</p>
    </div>

    <div class="px-4 mt-4 space-y-3">
      <div v-if="loading" class="text-center py-12 text-gray-400">載入中...</div>
      <div v-else-if="!enrollments.length" class="text-center py-12 text-gray-400">目前沒有課程邀請</div>

      <div
        v-for="e in enrollments"
        :key="e.id"
        class="bg-white rounded-2xl p-4 shadow-sm"
      >
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="font-semibold text-gray-800">{{ e.class?.title }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ e.class?.coach?.name }}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded-full font-medium" :class="statusColor[e.status]">
            {{ statusLabel[e.status] }}
          </span>
        </div>

        <p class="text-sm text-gray-500 mb-3">
          🕐 {{ dayjs(e.class?.start_at).format('MM/DD (dd) HH:mm') }}
          <span v-if="e.class?.end_at">— {{ dayjs(e.class?.end_at).format('HH:mm') }}</span>
        </p>
        <p v-if="e.class?.notes" class="text-xs text-gray-400 mb-3">{{ e.class.notes }}</p>

        <div class="flex gap-2">
          <a
            :href="googleCalendarUrl(e.class)"
            target="_blank"
            class="flex-1 text-center text-xs py-2 rounded-xl bg-blue-50 text-blue-600 font-medium"
          >
            Google 行事曆
          </a>
          <a
            :href="icalUrl(e.class?.id)"
            class="flex-1 text-center text-xs py-2 rounded-xl bg-gray-100 text-gray-600 font-medium"
          >
            下載 iCal
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
