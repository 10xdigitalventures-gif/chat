import axios from 'axios'

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const isAuthEndpoint = (url = '') => {
  const u = String(url)
  return (
    u.includes('/auth/login') ||
    u.includes('/auth/register') ||
    u.includes('/auth/forgot-password') ||
    u.includes('/auth/verify-reset-token') ||
    u.includes('/auth/reset-password')
  )
}

export const api = axios.create({
  baseURL: BASE,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    cfg.headers = cfg.headers || {}
    cfg.headers.Authorization = `Bearer ${token}`
  }

  return cfg
})

let refreshPromise = null

api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config || {}

    if (
      err.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true

      const rt = localStorage.getItem('refreshToken')

      if (!rt) {
        localStorage.clear()
        window.location.href = '/consultant/login'
        return Promise.reject(err)
      }

      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${BASE}/auth/refresh`, { refreshToken: rt })

        const { data } = await refreshPromise
        refreshPromise = null

        const newAccessToken = data.data.accessToken
        const newRefreshToken = data.data.refreshToken || rt

        localStorage.setItem('accessToken', newAccessToken)
        localStorage.setItem('refreshToken', newRefreshToken)

        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newAccessToken}`

        return api(original)
      } catch (refreshError) {
        refreshPromise = null
        localStorage.clear()
        window.location.href = '/consultant/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(err)
  }
)

export const authApi = {
  step1: email => api.post('/auth/login/step1', { email }),
  step2: body => api.post('/auth/login/step2', body),
  logout: rt => api.post('/auth/logout', { refreshToken: rt }),
  me: () => api.get('/auth/me'),
}

export const consultantApi = {
  getProfile: () => api.get('/consultant/profile'),
  updateProfile: body => api.put('/consultant/profile', body),
  setOnline: isOnline => api.put('/consultant/profile/online', { isOnline }),

  getClients: (p, ps, s) =>
    api.get('/consultant/clients', {
      params: { page: p, pageSize: ps, search: s },
    }),

  getRequests: () => api.get('/consultant/clients/requests'),
  acceptRequest: id => api.put(`/consultant/clients/requests/${id}/accept`),
  rejectRequest: id => api.put(`/consultant/clients/requests/${id}/reject`),

  getConversations: (p, ps) =>
    api.get('/consultant/messages', {
      params: { page: p, pageSize: ps },
    }),

  getMessages: (id, p, ps) =>
    api.get(`/consultant/messages/${id}`, {
      params: { page: p, pageSize: ps },
    }),

  sendMessage: (id, body) => api.post(`/consultant/messages/${id}`, body),

  markRead: id => api.put(`/consultant/messages/${id}/read`),

  getStats: () => api.get('/consultant/stats'),

  uploadAttachment: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/consultant/messages/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getAvailability: () => api.get('/consultant/availability'),
  saveAvailability: slots => api.put('/consultant/availability', slots),
  clearAvailability: () => api.delete('/consultant/availability'),

  getNotifications: (unreadOnly = false, page = 1, pageSize = 30) =>
    api.get('/consultant/notifications', {
      params: { unreadOnly, page, pageSize },
    }),

  markNotificationRead: id => api.put(`/consultant/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/consultant/notifications/read-all'),
}

export const notifApi = {
  getAll: (unreadOnly = false, page = 1, pageSize = 30) =>
    api.get('/consultant/notifications', {
      params: { unreadOnly, page, pageSize },
    }),

  markRead: id => api.put(`/consultant/notifications/${id}/read`),

  markAll: () => api.put('/consultant/notifications/read-all'),

  delete: id => api.delete(`/consultant/notifications/${id}`),
}
