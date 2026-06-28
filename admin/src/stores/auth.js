import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, setCoachHeader } from '../api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const isAuth = ref(!!localStorage.getItem('coach_uid'))
  const coachName = ref(localStorage.getItem('coach_name') || '')
  const lineUid = ref(localStorage.getItem('coach_uid') || '')

  async function login(password) {
    const res = await authApi.login(password)
    const { coach } = res.data
    isAuth.value = true
    coachName.value = coach.name
    lineUid.value = coach.line_uid
    setCoachHeader(coach.line_uid)
    localStorage.setItem('coach_uid', coach.line_uid)
    localStorage.setItem('coach_name', coach.name)
  }

  async function restore() {
    if (!lineUid.value) return
    setCoachHeader(lineUid.value)
    isAuth.value = true
  }

  function logout() {
    isAuth.value = false
    coachName.value = ''
    lineUid.value = ''
    localStorage.removeItem('coach_uid')
    localStorage.removeItem('coach_name')
  }

  return { isAuth, coachName, lineUid, login, restore, logout }
})
