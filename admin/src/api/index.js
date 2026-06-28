import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export function setCoachHeader(lineUid) {
  api.defaults.headers.common['x-line-uid'] = lineUid
}

export const authApi = {
  login: (password) => api.post('/api/auth/login', { password }),
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
}
