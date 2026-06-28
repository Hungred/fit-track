import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, setCoachHeader, setGymHeader } from '../api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const storedUid = localStorage.getItem('coach_uid') || ''
  const storedGymId = localStorage.getItem('gym_id') || ''

  const isAuth = ref(!!storedUid)
  const coachName = ref(localStorage.getItem('coach_name') || '')
  const lineUid = ref(storedUid)
  const gymId = ref(storedGymId)

  if (storedUid) setCoachHeader(storedUid)
  if (storedGymId) setGymHeader(storedGymId)

  function setGym(id) {
    gymId.value = id
    setGymHeader(id)
    localStorage.setItem('gym_id', id)
  }

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

  function logout() {
    isAuth.value = false
    coachName.value = ''
    lineUid.value = ''
    localStorage.removeItem('coach_uid')
    localStorage.removeItem('coach_name')
  }

  return { isAuth, coachName, lineUid, gymId, login, logout, setGym }
})
