import axios from 'axios'

// Use Vite proxy
const BASE = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: BASE
})

// â”€â”€ Attach JWT automatically â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('accessToken')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// â”€â”€ Refresh token on 401 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      const rt = localStorage.getItem('refreshToken')

      if (rt) {
        try {
          const { data } = await axios.post('/api/auth/refresh', {
            refreshToken: rt
          })

          localStorage.setItem('accessToken', data.data.accessToken)
          localStorage.setItem('refreshToken', data.data.refreshToken)

          err.config.headers.Authorization = `Bearer ${data.data.accessToken}`

          return api(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(err)
  }
)


// â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const authApi = {
  step1: email => api.post('/auth/login/step1', { email }),
  step2: body  => api.post('/auth/login/step2', body),
  logout: rt   => api.post('/auth/logout', { refreshToken: rt }),
  me: ()       => api.get('/auth/me'),

  externalLogin: body => api.post('/auth/external-login', body),
  getLinkedProviders: () => api.get('/auth/external-logins'),
  linkProvider: body => api.post('/auth/external-logins/link', body),
  unlinkProvider: prov => api.delete(`/auth/external-logins/${prov}`)
}


// â”€â”€ CONSULTANT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const consultantApi = {
  getProfile: () => api.get('/consultant/profile'),
  updateProfile: body => api.put('/consultant/profile', body),
  setOnline: isOnline => api.put('/consultant/profile/online', { isOnline }),

  getClients: (p, ps, s) =>
    api.get('/consultant/clients', {
      params: { page: p, pageSize: ps, search: s }
    }),

  getRequests: () => api.get('/consultant/clients/requests'),
  acceptRequest: id => api.put(`/consultant/clients/requests/${id}/accept`),
  rejectRequest: id => api.put(`/consultant/clients/requests/${id}/reject`),

  getConversations: (p, ps) =>
    api.get('/consultant/messages', {
      params: { page: p, pageSize: ps }
    }),

  getMessages: (id, p, ps) =>
    api.get(`/consultant/messages/${id}`, {
      params: { page: p, pageSize: ps }
    }),

  sendMessage: (id, body) =>
    api.post(`/consultant/messages/${id}`, body),

  markRead: id =>
    api.put(`/consultant/messages/${id}/read`),

  getStats: () => api.get('/consultant/stats'),

  uploadAttachment: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/consultant/messages/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}


// â”€â”€ AVAILABILITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const availApi = {
  get: () => api.get('/consultant/availability'),
  save: slots => api.put('/consultant/availability', slots),
  clear: () => api.delete('/consultant/availability')
}


// â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const notifApi = {
  getAll: unreadOnly =>
    api.get('/consultant/notifications', {
      params: { unreadOnly, page: 1, pageSize: 30 }
    }),

  markRead: id =>
    api.put(`/consultant/notifications/${id}/read`),

  markAll: () =>
    api.put('/consultant/notifications/read-all')
}
