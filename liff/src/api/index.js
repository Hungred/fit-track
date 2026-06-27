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
  checkin: (method = 'button') => api.post('/api/checkin', { method }),
}
