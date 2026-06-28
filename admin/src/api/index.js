import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export function setCoachHeader(lineUid) {
  api.defaults.headers.common['x-line-uid'] = lineUid
}

export function setGymHeader(gymId) {
  api.defaults.headers.common['x-gym-id'] = gymId
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

  generateQrToken: () => api.post('/api/coach/qr-token'),
  getReport: (month) => api.get('/api/coach/report', { params: { month } }),
  getTodayLeaves: () => api.get('/api/coach/leaves'),
}

export const operatorApi = {
  login: (password) => api.post('/api/operator/login', { password }),
  listGyms: () => api.get('/api/operator/gyms', { headers: { 'x-operator-password': localStorage.getItem('operator_password') } }),
  getGym: (id) => api.get(`/api/operator/gyms/${id}`, { headers: { 'x-operator-password': localStorage.getItem('operator_password') } }),
  createGym: (data) => api.post('/api/operator/gyms', data, { headers: { 'x-operator-password': localStorage.getItem('operator_password') } }),
  updateGym: (id, data) => api.patch(`/api/operator/gyms/${id}`, data, { headers: { 'x-operator-password': localStorage.getItem('operator_password') } }),
  deleteGym: (id) => api.delete(`/api/operator/gyms/${id}`, { headers: { 'x-operator-password': localStorage.getItem('operator_password') } }),
}
