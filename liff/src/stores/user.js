import { defineStore } from 'pinia'
import { ref } from 'vue'
import { memberApi, setAuthHeader } from '../api/index.js'
import { getLineProfile } from '../lib/liff.js'

export const useUserStore = defineStore('user', () => {
  const member = ref(null)
  const packages = ref([])
  const lineProfile = ref(null)
  const loading = ref(false)

  async function init() {
    loading.value = true
    try {
      lineProfile.value = await getLineProfile()
      setAuthHeader(lineProfile.value.userId, lineProfile.value.displayName)
      const res = await memberApi.getMe()
      member.value = res.data.member
      packages.value = res.data.packages
    } catch (err) {
      // 404 代表尚未綁定
      if (err.response?.status === 401) {
        member.value = null
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

  return { member, packages, lineProfile, loading, init, bindMember }
})
