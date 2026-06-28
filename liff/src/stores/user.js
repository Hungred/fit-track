import { defineStore } from 'pinia'
import { ref } from 'vue'
import { memberApi, setAuthHeader } from '../api/index.js'
import { getLineProfile } from '../lib/liff.js'

export const useUserStore = defineStore('user', () => {
  const member = ref(null)
  const packages = ref([])
  const lineProfile = ref(null)
  const loading = ref(false)
  const initError = ref(null)

  async function init() {
    loading.value = true
    initError.value = null
    try {
      lineProfile.value = await getLineProfile()
      setAuthHeader(lineProfile.value.userId, lineProfile.value.displayName)
      const res = await memberApi.getMe()
      member.value = res.data.member
      packages.value = res.data.packages
    } catch (err) {
      if (err.response?.status === 401) {
        // 尚未綁定，導向綁定頁
        member.value = null
      } else {
        // API 錯誤（冷啟動、網路問題），保留 loading 狀態讓 UI 顯示錯誤
        initError.value = '連線中，請稍後再試...'
      }
    } finally {
      loading.value = false
    }
  }

  async function bindMember(name, phone) {
    const res = await memberApi.bind({ name, phone })
    member.value = res.data.member
    await init()
  }

  return { member, packages, lineProfile, loading, initError, init, bindMember }
})
