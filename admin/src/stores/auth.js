import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, setCoachHeader, setGymHeader } from '../api/index.js'

function getGymIdCookie() {
  const m = document.cookie.match(/(?:^|;\s*)gym_id=([^;]+)/)
  return m ? m[1] : ''
}

function setGymIdCookie(id) {
  document.cookie = `gym_id=${id}; path=/; max-age=31536000; SameSite=Strict`
}

export const useAuthStore = defineStore('auth', () => {
  const storedUid = localStorage.getItem('coach_uid') || ''
  const storedGymId = localStorage.getItem('gym_id') || getGymIdCookie() || ''
  const storedPermissions = JSON.parse(localStorage.getItem('permissions') || '[]')
  const storedIsOwner = localStorage.getItem('is_owner') === 'true'

  const isAuth = ref(!!storedUid)
  const coachName = ref(localStorage.getItem('coach_name') || '')
  const lineUid = ref(storedUid)
  const gymId = ref(storedGymId)
  const permissions = ref(storedPermissions)
  const isOwner = ref(storedIsOwner)

  if (storedUid) setCoachHeader(storedUid)
  if (storedGymId) setGymHeader(storedGymId)

  const hasPermission = computed(() => (key) => {
    return permissions.value.includes(key)
  })

  function setGym(id) {
    gymId.value = id
    setGymHeader(id)
    localStorage.setItem('gym_id', id)
    setGymIdCookie(id)
  }

  async function login(username, password) {
    const res = await authApi.login(username, password)
    const { coach } = res.data
    isAuth.value = true
    coachName.value = coach.name
    lineUid.value = coach.line_uid
    permissions.value = coach.permissions || []
    isOwner.value = !!coach.is_owner
    setCoachHeader(coach.line_uid)
    localStorage.setItem('coach_uid', coach.line_uid)
    localStorage.setItem('coach_name', coach.name)
    localStorage.setItem('permissions', JSON.stringify(coach.permissions || []))
    localStorage.setItem('is_owner', String(!!coach.is_owner))
  }

  function logout() {
    isAuth.value = false
    coachName.value = ''
    lineUid.value = ''
    permissions.value = []
    isOwner.value = false
    localStorage.removeItem('coach_uid')
    localStorage.removeItem('coach_name')
    localStorage.removeItem('permissions')
    localStorage.removeItem('is_owner')
  }

  return { isAuth, coachName, lineUid, gymId, permissions, isOwner, hasPermission, login, logout, setGym }
})
