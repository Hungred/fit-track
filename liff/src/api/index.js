import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// 每次 request 自動帶入 LINE UID
export function setAuthHeader(lineUid, displayName) {
  api.defaults.headers.common['x-line-uid'] = lineUid
  api.defaults.headers.common['x-line-display-name'] = displayName
}

export const memberApi = {
  bind: (data) => api.post('/api/members/bind', data),
  getMe: () => api.get('/api/members/me'),
  getCheckinHistory: (month) => api.get('/api/members/me/checkins', { params: { month } }),
}

export const checkinApi = {
  checkin: (method = 'button', qr_token = null) =>
    api.post('/api/checkin', { method, ...(qr_token && { qr_token }) }),
}

export const leaveApi = {
  getMyLeaves: () => api.get('/api/members/me/leaves'),
  requestLeave: (leave_date, reason) => api.post('/api/members/me/leave', { leave_date, reason }),
  cancelLeave: (leave_date) => api.delete('/api/members/me/leave', { data: { leave_date } }),
}
