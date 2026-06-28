import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setCoachHeader } from '../api/index.js'
import { coachApi } from '../api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const lineUid = ref(localStorage.getItem('coach_uid') || '')
  const isAuth = ref(false)

  async function login(uid) {
    setCoachHeader(uid)
    await coachApi.getDashboard() // 驗證是否為教練身份
    lineUid.value = uid
    isAuth.value = true
    localStorage.setItem('coach_uid', uid)
  }

  async function restore() {
    if (!lineUid.value) return
    try {
      setCoachHeader(lineUid.value)
      await coachApi.getDashboard()
      isAuth.value = true
    } catch {
      logout()
    }
  }

  function logout() {
    lineUid.value = ''
    isAuth.value = false
    localStorage.removeItem('coach_uid')
  }

  return { lineUid, isAuth, login, restore, logout }
})
