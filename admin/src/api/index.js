import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/operator')) {
      localStorage.removeItem('coach_uid')
      localStorage.removeItem('coach_name')
      localStorage.removeItem('permissions')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export function setCoachHeader(lineUid) {
  api.defaults.headers.common['x-line-uid'] = lineUid
}

export function setGymHeader(gymId) {
  api.defaults.headers.common['x-gym-id'] = gymId
}

export const authApi = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  changePassword: (current_password, new_password) => api.post('/api/auth/change-password', { current_password, new_password }),
}

export const coachApi = {
  getDashboard: () => api.get('/api/coach/dashboard'),
  getCheckins: (params) => api.get('/api/coach/checkins', { params }),
  manualCheckin: (data) => api.post('/api/checkin/manual', data),

  getPackages: () => api.get('/api/coach/packages'),
  createPackage: (data) => api.post('/api/coach/packages', data),
  updatePackage: (id, data) => api.patch(`/api/coach/packages/${id}`, data),
  deletePackage: (id) => api.delete(`/api/coach/packages/${id}`),
  assignPackage: (data) => api.post('/api/coach/packages/assign', data),
  adjustSessions: (id, data) => api.patch(`/api/coach/member-packages/${id}/adjust`, data),

  updateMemberPackage: (id, data) => api.patch(`/api/coach/member-packages/${id}`, data),
  deleteMemberPackage: (id) => api.delete(`/api/coach/member-packages/${id}`),
  updateCheckin: (id, data) => api.patch(`/api/coach/checkins/${id}`, data),
  deleteCheckin: (id) => api.delete(`/api/coach/checkins/${id}`),

  generateQrToken: () => api.post('/api/coach/qr-token'),
  getReport: (month) => api.get('/api/coach/report', { params: { month } }),
  getTodayLeaves: () => api.get('/api/coach/leaves'),
}

export const classApi = {
  list: (month) => api.get('/api/coach/classes', { params: { month } }),
  get: (id) => api.get(`/api/coach/classes/${id}`),
  create: (data) => api.post('/api/coach/classes', data),
  batchCreate: (classes) => api.post('/api/coach/classes/batch', { classes }),
  update: (id, data) => api.patch(`/api/coach/classes/${id}`, data),
  delete: (id) => api.delete(`/api/coach/classes/${id}`),
  updateEnrollmentStatus: (classId, memberId, status) =>
    api.patch(`/api/coach/classes/${classId}/enrollments/${memberId}`, { status }),
}

export const coachManageApi = {
  list: () => api.get('/api/coach/coaches'),
  create: (data) => api.post('/api/coach/coaches', data),
  update: (id, data) => api.patch(`/api/coach/coaches/${id}`, data),
  delete: (id) => api.delete(`/api/coach/coaches/${id}`),
}

export const spaceApi = {
  listSpaces: () => api.get('/api/spaces'),
  createSpace: (data) => api.post('/api/spaces', data),
  updateSpace: (id, data) => api.patch(`/api/spaces/${id}`, data),
  deleteSpace: (id) => api.delete(`/api/spaces/${id}`),
  listBookings: (params = {}) => api.get('/api/spaces/bookings', { params }),
  createBooking: (data) => api.post('/api/spaces/bookings', data),
  updateBooking: (id, data) => api.patch(`/api/spaces/bookings/${id}`, data),
  deleteBooking: (id) => api.delete(`/api/spaces/bookings/${id}`),
}

export const gymSettingsApi = {
  getSpaceSettings: () => api.get('/api/coach/space-settings'),
  updateSpaceSettings: (data) => api.patch('/api/coach/space-settings', data),
  uploadPdf: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/coach/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

const opHeaders = () => ({ 'x-operator-password': localStorage.getItem('operator_password') })

export const operatorApi = {
  login: (password) => api.post('/api/operator/login', { password }),
  listGyms: () => api.get('/api/operator/gyms', { headers: opHeaders() }),
  getGym: (id) => api.get(`/api/operator/gyms/${id}`, { headers: opHeaders() }),
  createGym: (data) => api.post('/api/operator/gyms', data, { headers: opHeaders() }),
  updateGym: (id, data) => api.patch(`/api/operator/gyms/${id}`, data, { headers: opHeaders() }),
  deleteGym: (id) => api.delete(`/api/operator/gyms/${id}`, { headers: opHeaders() }),
  getLogs: (params = {}) => api.get('/api/operator/logs', { headers: opHeaders(), params }),
}
