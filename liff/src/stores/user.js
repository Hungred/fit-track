import { defineStore } from 'pinia'
import { ref } from 'vue'
import { memberApi, setAuthHeader, setGymHeader } from '../api/index.js'
import { getLineProfile } from '../lib/liff.js'

export const useUserStore = defineStore('user', () => {
  const member = ref(null)
  const packages = ref([])
  const lineProfile = ref(null)
  const loading = ref(true)
  const initError = ref(null)
  const gymId = ref(null)

  function setGym(id) {
    gymId.value = id
    setGymHeader(id)
    localStorage.setItem('gym_id', id)
  }

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
        member.value = null
      } else {
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

  return { member, packages, lineProfile, loading, initError, gymId, init, bindMember, setGym }
})
